import { ExecutionItem, BranchDiff, PlanTask, ExecutionStatus } from '../types';
import { MOCK_BRANCH_DIFF } from '../data/mockData';

export interface JulesPayload {
  repository: string;
  base_branch: string;
  head_branch: string;
  prompt: string;
  constraints: {
    allowed_paths?: string[];
    forbidden_paths?: string[];
  };
  task_id?: string;
  title?: string;
}

export interface StartTaskParams {
  task: PlanTask;
  repo: string;
  baseBranch?: string;
  branchName?: string;
  apiKey?: string;
  baseUrl?: string;
  mode?: 'demo' | 'live' | 'mock';
}

export interface GetTaskParams {
  taskId: string;
  apiKey?: string;
  baseUrl?: string;
}

export class JulesService {
  /**
   * Submit a task to the Jules coding agent with X-Jules-Key header
   */
  static async createTask(
    payload: JulesPayload,
    julesApiKey?: string,
    julesBaseUrl = 'https://api.jules.ai/v1',
    mode: 'mock' | 'live' = 'mock'
  ): Promise<{ taskId: string; status: ExecutionStatus; isLive: boolean; message: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (julesApiKey && julesApiKey.trim()) {
      headers['X-Jules-Key'] = julesApiKey.trim();
    }

    const res = await fetch('/api/jules/task/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({ payload, julesBaseUrl, mode }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to submit task to Jules API');
    }
    return data;
  }

  /**
   * Start a task with PlanTask object parameters
   */
  static async startTask(params: StartTaskParams): Promise<{ taskId: string; status: ExecutionStatus; isLive: boolean; message: string }> {
    const payload: JulesPayload = {
      repository: params.repo,
      base_branch: params.baseBranch || 'main',
      head_branch: params.branchName || `jules/${params.task.id.toLowerCase()}`,
      prompt: params.task.jules_prompt,
      constraints: {
        allowed_paths: params.task.expected_paths,
        forbidden_paths: params.task.forbidden_paths,
      },
      task_id: params.task.id,
      title: params.task.title,
    };

    const mode = params.mode === 'live' ? 'live' : 'mock';
    return this.createTask(payload, params.apiKey, params.baseUrl, mode);
  }

  /**
   * Poll Jules task status and real-time execution log history
   */
  static async getTask(taskIdOrParams: string | GetTaskParams): Promise<{
    id: string;
    status: ExecutionStatus;
    progress: number;
    currentStage: string;
    logs: string[];
    diff?: BranchDiff;
    error?: string;
  }> {
    const taskId = typeof taskIdOrParams === 'string' ? taskIdOrParams : taskIdOrParams.taskId;
    const res = await fetch(`/api/jules/task/${taskId}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch Jules task');
    }
    return data;
  }

  /**
   * Alias for getTask
   */
  static async getTaskStatus(params: GetTaskParams) {
    return this.getTask(params);
  }

  /**
   * Cancel an ongoing Jules task
   */
  static async cancelTask(taskIdOrParams: string | { taskId: string; apiKey?: string; baseUrl?: string }) {
    const taskId = typeof taskIdOrParams === 'string' ? taskIdOrParams : taskIdOrParams.taskId;
    const res = await fetch(`/api/jules/task/${taskId}/cancel`, {
      method: 'POST',
    });
    return await res.json();
  }

  /**
   * Wait for task completion with periodic callback and polling
   */
  static async waitForCompletion(
    taskId: string,
    onUpdate: (taskState: any) => void,
    intervalMs = 1000,
    maxWaitMs = 90000
  ): Promise<any> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const pollTimer = setInterval(async () => {
        try {
          if (Date.now() - startTime > maxWaitMs) {
            clearInterval(pollTimer);
            reject(new Error('Jules task execution timed out'));
            return;
          }

          const task = await JulesService.getTask(taskId);
          onUpdate(task);

          if (task.status === 'passed' || task.status === 'completed' as any) {
            clearInterval(pollTimer);
            resolve({
              ...task,
              diff: task.diff || MOCK_BRANCH_DIFF,
            });
          } else if (
            task.status === 'failed' ||
            task.status === 'failed_verification' ||
            task.status === 'cancelled'
          ) {
            clearInterval(pollTimer);
            resolve(task);
          }
        } catch (err) {
          clearInterval(pollTimer);
          reject(err);
        }
      }, intervalMs);
    });
  }

  /**
   * Execute multiple independent tasks in parallel (PILLAR 1: Concurrent Execution)
   */
  static async executeConcurrentTasks(
    tasks: PlanTask[],
    params: {
      repo: string;
      baseBranch?: string;
      apiKey?: string;
      baseUrl?: string;
      mode?: 'demo' | 'live' | 'mock';
      onTaskProgress?: (taskId: string, progress: number, stage: string, status: ExecutionStatus) => void;
      onTaskLogs?: (taskId: string, logs: string[]) => void;
    }
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const executions = tasks.map(async (task) => {
      try {
        const branchName = `jules/${task.id.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
        const startRes = await this.startTask({
          task,
          repo: params.repo,
          baseBranch: params.baseBranch,
          branchName,
          apiKey: params.apiKey,
          baseUrl: params.baseUrl,
          mode: params.mode,
        });

        params.onTaskProgress?.(task.id, 15, 'Task queued in Jules runtime...', 'jules_running');

        const completedTask = await this.waitForCompletion(startRes.taskId, (update) => {
          params.onTaskProgress?.(task.id, update.progress, update.currentStage, update.status);
          if (update.logs && params.onTaskLogs) {
            params.onTaskLogs(task.id, update.logs);
          }
        });

        results.set(task.id, {
          success: completedTask.status === 'passed' || completedTask.status === 'completed',
          taskData: completedTask,
          branchName,
        });
      } catch (err: any) {
        results.set(task.id, {
          success: false,
          error: err.message || 'Execution failed',
        });
        params.onTaskProgress?.(task.id, 100, `Failed: ${err.message}`, 'failed');
      }
    });

    await Promise.all(executions);
    return results;
  }
}
