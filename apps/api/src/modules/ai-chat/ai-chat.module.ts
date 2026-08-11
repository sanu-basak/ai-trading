import { z } from 'zod';
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { AppContainer } from '../../di';
import { asyncHandler, authenticate, validate } from '../../middleware';
import { NotFoundError } from '../../shared/errors';
import { sendCreated, sendNoContent, sendOk } from '../../http/response';
import type { ChatMessage } from '../../shared/infrastructure/llm';
import { PrismaChatRepository } from './prisma-chat.repository';

const SYSTEM_PROMPT =
  "You are DEVQUANTIC's trading-analysis assistant. Explain markets, technical " +
  'indicators, chart patterns, strategies and risk management in a clear, educational ' +
  'way. You are NOT a licensed financial advisor: never give personalized investment ' +
  'advice, never guarantee outcomes, and remind the user that trading carries substantial ' +
  'risk of loss. Be concise, precise, and cite the reasoning behind any analysis.';

const createSchema = z.object({ title: z.string().trim().max(120).optional() });
const idParam = z.object({ id: z.string().min(1) });
const messageSchema = z.object({ content: z.string().trim().min(1).max(4000) });

export function registerAiChatModule(container: AppContainer): Router {
  const { prisma, tokenService, llm, logger } = container.cradle;
  const repo = new PrismaChatRepository(prisma.client as unknown as PrismaClient);
  const router = Router();
  router.use(authenticate(tokenService));

  router.get(
    '/status',
    asyncHandler(async (_req, res) => sendOk(res, { available: llm.available })),
  );

  router.get(
    '/conversations',
    asyncHandler(async (req, res) => sendOk(res, await repo.listConversations(req.user!.id))),
  );

  router.post(
    '/conversations',
    validate({ body: createSchema }),
    asyncHandler(async (req, res) => {
      const { title } = req.body as { title?: string };
      sendCreated(res, await repo.createConversation(req.user!.id, title ?? null));
    }),
  );

  router.get(
    '/conversations/:id',
    validate({ params: idParam }),
    asyncHandler(async (req, res) => {
      const c = await repo.getConversation(req.params.id!, req.user!.id);
      if (!c) throw new NotFoundError('Conversation');
      sendOk(res, c);
    }),
  );

  router.delete(
    '/conversations/:id',
    validate({ params: idParam }),
    asyncHandler(async (req, res) => {
      const ok = await repo.deleteConversation(req.params.id!, req.user!.id);
      if (!ok) throw new NotFoundError('Conversation');
      sendNoContent(res);
    }),
  );

  router.post(
    '/conversations/:id/messages',
    validate({ params: idParam, body: messageSchema }),
    asyncHandler(async (req, res) => {
      const conversationId = req.params.id!;
      const { content } = req.body as { content: string };

      const conversation = await repo.getConversation(conversationId, req.user!.id);
      if (!conversation) throw new NotFoundError('Conversation');

      await repo.addMessage(conversationId, 'USER', content);

      const history: ChatMessage[] = [
        ...conversation.messages
          .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
          .map((m) => ({ role: m.role.toLowerCase() as 'user' | 'assistant', content: m.content })),
        { role: 'user', content },
      ];

      const result = await llm.chat(history, { system: SYSTEM_PROMPT });
      const assistant = await repo.addMessage(conversationId, 'ASSISTANT', result.content, {
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      });
      await repo.recordUsage(req.user!.id, result.provider, result.model, result.promptTokens, result.completionTokens);

      // Name a fresh conversation from its first exchange.
      if (!conversation.title && conversation.messages.length === 0) {
        await repo.setTitle(conversationId, content.slice(0, 60));
      }
      logger.debug({ conversationId, provider: result.provider }, 'AI chat reply');
      sendOk(res, assistant);
    }),
  );

  return router;
}
