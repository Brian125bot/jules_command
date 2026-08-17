import { SettingsState } from '../types';

export const DEFAULT_SETTINGS: SettingsState = {
  githubToken: '',
  githubBaseUrl: 'https://api.github.com',
  julesApiKey: '',
  julesBaseUrl: 'https://jules.googleapis.com',
  julesMode: 'live',
  maxAutoRepairs: 3,
  requireHumanForHighRisk: true,
  requireCiPass: true,
  requireTests: true,
  maxFilesChanged: 15,
  maxAdditions: 800,
  maxDeletions: 400,
  defaultAllowedPaths: [],
  defaultForbiddenPaths: ['.github/workflows/', 'infrastructure/', 'secrets/'],
  geminiModel: 'gemini-2.5-flash',
  geminiTemperature: 0.2,
};