import { ServiceUnavailableError, UpstreamError } from '../../errors';
import type { AppConfig } from '../config';
import type { Logger } from '../logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  provider: 'ANTHROPIC' | 'OPENAI';
}

export interface ChatOptions {
  system?: string;
  maxTokens?: number;
}

/**
 * Thin LLM adapter over the provider REST APIs (no SDK dependency). Uses
 * Anthropic when ANTHROPIC_API_KEY is set, else OpenAI, else reports the feature
 * as unconfigured with an actionable message — it never fabricates a reply.
 */
export class LlmService {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  get available(): boolean {
    return Boolean(this.config.env.ANTHROPIC_API_KEY || this.config.env.OPENAI_API_KEY);
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<LlmResult> {
    if (this.config.env.ANTHROPIC_API_KEY) return this.anthropic(messages, options);
    if (this.config.env.OPENAI_API_KEY) return this.openai(messages, options);
    throw new ServiceUnavailableError(
      'AI chat is not configured. Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) on the API to enable it.',
    );
  }

  private async anthropic(messages: ChatMessage[], options: ChatOptions): Promise<LlmResult> {
    const model = this.config.env.LLM_MODEL;
    const body = {
      model,
      max_tokens: options.maxTokens ?? this.config.env.LLM_MAX_TOKENS,
      system: options.system,
      messages,
    };
    const res = await this.request('https://api.anthropic.com/v1/messages', {
      'x-api-key': this.config.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }, body);
    const data = res as {
      content?: Array<{ type: string; text?: string }>;
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
      .trim();
    return {
      content,
      model: data.model ?? model,
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
      provider: 'ANTHROPIC',
    };
  }

  private async openai(messages: ChatMessage[], options: ChatOptions): Promise<LlmResult> {
    const model = this.config.env.LLM_MODEL.startsWith('claude') ? 'gpt-4o-mini' : this.config.env.LLM_MODEL;
    const full = options.system ? [{ role: 'system', content: options.system }, ...messages] : messages;
    const res = await this.request('https://api.openai.com/v1/chat/completions', {
      authorization: `Bearer ${this.config.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    }, { model, max_tokens: options.maxTokens ?? this.config.env.LLM_MAX_TOKENS, messages: full });
    const data = res as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      content: (data.choices?.[0]?.message?.content ?? '').trim(),
      model: data.model ?? model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      provider: 'OPENAI',
    };
  }

  private async request(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.logger.error({ status: res.status, detail: detail.slice(0, 300) }, 'LLM request failed');
        throw new UpstreamError(`LLM provider responded ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      throw new UpstreamError('LLM provider is unreachable', { cause: err });
    } finally {
      clearTimeout(timer);
    }
  }
}
