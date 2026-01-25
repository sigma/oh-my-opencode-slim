/**
 * Background Task Manager
 * 
 * Manages long-running AI agent tasks that execute in separate sessions.
 */

import type { PluginInput } from "@opencode-ai/plugin";
import { 
  log, 
  POLL_INTERVAL_BACKGROUND_MS, 
  POLL_INTERVAL_SLOW_MS,
  type PluginConfig,
  type MultiplexerConfig,
} from "@firefly-swarm/shared";
import { applyAgentVariant, resolveAgentVariant } from "./utils";

type PromptBody = {
  messageID?: string;
  model?: { providerID: string; modelID: string };
  agent?: string;
  noReply?: boolean;
  system?: string;
  tools?: { [key: string]: boolean };
  parts: Array<{ type: "text"; text: string }>;
  variant?: string;
};

type OpencodeClient = PluginInput["client"];

/**
 * Represents a background task running in an isolated session.
 */
export interface BackgroundTask {
  id: string;
  sessionId: string;
  description: string;
  agent: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Options for launching a new background task.
 */
export interface LaunchOptions {
  agent: string;
  prompt: string;
  description: string;
  parentSessionId: string;
  model?: string;
}

function generateTaskId(): string {
  return `bg_${Math.random().toString(36).substring(2, 10)}`;
}

export class BackgroundTaskManager {
  private tasks = new Map<string, BackgroundTask>();
  private client: OpencodeClient;
  private directory: string;
  private pollInterval?: ReturnType<typeof setInterval>;
  private multiplexerEnabled: boolean;
  private config?: PluginConfig;

  constructor(ctx: PluginInput, multiplexerConfig?: MultiplexerConfig, config?: PluginConfig) {
    this.client = ctx.client;
    this.directory = ctx.directory;
    this.multiplexerEnabled = multiplexerConfig?.enabled ?? false;
    this.config = config;
  }

  /**
   * Launch a new background task in an isolated session.
   */
  async launch(opts: LaunchOptions): Promise<BackgroundTask> {
    const session = await this.client.session.create({
      body: {
        parentID: opts.parentSessionId,
        title: `Background: ${opts.description}`,
      },
      query: { directory: this.directory },
    });

    if (!session.data?.id) {
      throw new Error("Failed to create background session");
    }

    const task: BackgroundTask = {
      id: generateTaskId(),
      sessionId: session.data.id,
      description: opts.description,
      agent: opts.agent,
      status: "running",
      startedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.startPolling();

    // Give MultiplexerManager time to spawn the pane via event hook
    if (this.multiplexerEnabled) {
      await new Promise((r) => setTimeout(r, 500));
    }

    const promptQuery: Record<string, string> = {
      directory: this.directory,
    };
    if (opts.model) {
      promptQuery.model = opts.model;
    }

    log(`[background-manager] launching task for agent="${opts.agent}"`, { description: opts.description });
    const resolvedVariant = resolveAgentVariant(this.config, opts.agent);
    const promptBody = applyAgentVariant(resolvedVariant, {
      agent: opts.agent,
      tools: { background_task: false, task: false },
      parts: [{ type: "text" as const, text: opts.prompt }],
    } as PromptBody) as unknown as PromptBody;

    await this.client.session.prompt({
      path: { id: session.data.id },
      body: promptBody,
      query: promptQuery,
    });

    return task;
  }

  /**
   * Retrieve the current state of a background task.
   */
  async getResult(taskId: string, block = false, timeout = 120000): Promise<BackgroundTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (!block || task.status === "completed" || task.status === "failed") {
      return task;
    }

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await this.pollTask(task);
      if ((task.status as string) === "completed" || (task.status as string) === "failed") {
        return task;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_SLOW_MS));
    }

    return task;
  }

  /**
   * Cancel one or all running background tasks.
   */
  cancel(taskId?: string): number {
    if (taskId) {
      const task = this.tasks.get(taskId);
      if (task && task.status === "running") {
        task.status = "failed";
        task.error = "Cancelled by user";
        task.completedAt = new Date();
        return 1;
      }
      return 0;
    }

    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === "running") {
        task.status = "failed";
        task.error = "Cancelled by user";
        task.completedAt = new Date();
        count++;
      }
    }
    return count;
  }

  private startPolling() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => this.pollAllTasks(), POLL_INTERVAL_BACKGROUND_MS);
  }

  private async pollAllTasks() {
    const runningTasks = [...this.tasks.values()].filter((t) => t.status === "running");
    if (runningTasks.length === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
      return;
    }

    for (const task of runningTasks) {
      await this.pollTask(task);
    }
  }

  private async pollTask(task: BackgroundTask) {
    try {
      const statusResult = await this.client.session.status();
      const allStatuses = (statusResult.data ?? {}) as Record<string, { type: string }>;
      const sessionStatus = allStatuses[task.sessionId];

      if (task.status !== "running" || (sessionStatus && sessionStatus.type !== "idle")) {
        return;
      }

      const messagesResult = await this.client.session.messages({ path: { id: task.sessionId } });
      const messages = (messagesResult.data ?? []) as Array<{ info?: { role: string }; parts?: Array<{ type: string; text?: string }> }>;
      const assistantMessages = messages.filter((m) => m.info?.role === "assistant");

      if (assistantMessages.length === 0) {
        return;
      }

      const extractedContent: string[] = [];
      for (const message of assistantMessages) {
        for (const part of message.parts ?? []) {
          if ((part.type === "text" || part.type === "reasoning") && part.text) {
            extractedContent.push(part.text);
          }
        }
      }

      const responseText = extractedContent.filter((t) => t.length > 0).join("\n\n");
      if (responseText) {
        task.result = responseText;
        task.status = "completed";
        task.completedAt = new Date();
      }
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
    }
  }
}
