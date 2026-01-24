export interface Account {
  email: string;
  refreshToken: string;
  projectId?: string;
  managedProjectId?: string;
  rateLimitResetTimes: Record<string, number>;
}

export interface AccountsConfig {
  accounts: Account[];
  activeIndex: number;
}

export interface QuotaInfo {
  remainingFraction?: number;
  resetTime?: string;
}

export interface ModelInfo {
  displayName?: string;
  model?: string;
  quotaInfo?: QuotaInfo;
  recommended?: boolean;
}

export interface QuotaResponse {
  models?: Record<string, ModelInfo>;
}

export interface TokenResponse {
  access_token: string;
}

export interface LoadCodeAssistResponse {
  cloudaicompanionProject?: unknown;
}

export interface ModelQuota {
  name: string;
  percent: number;
  resetIn: string;
}

export interface AccountQuotaResult {
  email: string;
  success: boolean;
  error?: string;
  models: ModelQuota[];
}
