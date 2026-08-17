import { ExecutionStatus, PlanTask } from '../types';

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
}

export class JulesService {
  /**
   * Submit a task to the Google Jules API with X-Jules-Key header
   */
  static async createTask(
    payload: JulesPayload,
    julesApiKey?: string,
    julesBaseUrl = 'https://jules.googleapis.com'
  ): Promise<{ taskId: string; status: ExecutionStatus; isLive: boolean; message: string }> {
    if (!julesApiKey || !julesApiKey.trim()) {
      throw new Error('Jules API key is required for live mode');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    headers['X-Jules-Key'] = julesApiKey.trim();

    const res = await fetch('/api/jules/task/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({ payload, julesBaseUrl }),
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

    return this.createTask(payload, params.apiKey, params.baseUrl);
  }
}