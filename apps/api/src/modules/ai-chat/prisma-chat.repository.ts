import { Prisma, type PrismaClient } from '@prisma/client';

export interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface ChatMessageView {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessageView[];
}

export class PrismaChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createConversation(userId: string, title: string | null): Promise<ConversationSummary> {
    const c = await this.prisma.conversation.create({ data: { userId, title } });
    return { id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() };
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const rows = await this.prisma.conversation.findMany({
      where: { userId, archived: false },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return rows.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() }));
  }

  async getConversation(id: string, userId: string): Promise<ConversationDetail | null> {
    const c = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async addMessage(
    conversationId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
    usage?: { model?: string; promptTokens?: number; completionTokens?: number },
  ): Promise<ChatMessageView> {
    const [m] = await this.prisma.$transaction([
      this.prisma.conversationMessage.create({
        data: {
          conversationId,
          role,
          content,
          model: usage?.model ?? null,
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
        },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);
    return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt.toISOString() };
  }

  async setTitle(id: string, title: string): Promise<void> {
    await this.prisma.conversation.update({ where: { id }, data: { title } });
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.conversation.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  async recordUsage(
    userId: string,
    provider: 'ANTHROPIC' | 'OPENAI',
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): Promise<void> {
    await this.prisma.aiUsageRecord.create({
      data: {
        userId,
        feature: 'CHAT',
        provider: provider as Prisma.AiUsageRecordUncheckedCreateInput['provider'],
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    });
  }
}
