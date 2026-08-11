import { Prisma, type PrismaClient, type Strategy } from '@prisma/client';

export interface StrategyView {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  visibility: string;
  definition: unknown;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyInput {
  name: string;
  description?: string | null;
  type?: string;
  definition?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateStrategyInput {
  name?: string;
  description?: string | null;
  status?: string;
  visibility?: string;
  definition?: Record<string, unknown>;
  tags?: string[];
}

function toView(s: Strategy): StrategyView {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    type: s.type,
    status: s.status,
    visibility: s.visibility,
    definition: s.definition,
    tags: s.tags,
    version: s.version,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export class PrismaStrategyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateStrategyInput): Promise<StrategyView> {
    const s = await this.prisma.strategy.create({
      data: {
        userId,
        name: input.name,
        description: input.description ?? null,
        type: (input.type ?? 'RULE_BASED') as Prisma.StrategyUncheckedCreateInput['type'],
        definition: (input.definition ?? {}) as Prisma.InputJsonValue,
        tags: input.tags ?? [],
      },
    });
    return toView(s);
  }

  async listByUser(userId: string): Promise<StrategyView[]> {
    const rows = await this.prisma.strategy.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toView);
  }

  async findById(id: string, userId: string): Promise<StrategyView | null> {
    const row = await this.prisma.strategy.findFirst({ where: { id, userId } });
    return row ? toView(row) : null;
  }

  async update(id: string, userId: string, input: UpdateStrategyInput): Promise<StrategyView | null> {
    const existing = await this.prisma.strategy.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const bumpVersion = input.definition !== undefined;
    const row = await this.prisma.strategy.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        status: input.status as Prisma.StrategyUncheckedUpdateInput['status'],
        visibility: input.visibility as Prisma.StrategyUncheckedUpdateInput['visibility'],
        definition: input.definition as Prisma.InputJsonValue | undefined,
        tags: input.tags,
        version: bumpVersion ? { increment: 1 } : undefined,
      },
    });
    return toView(row);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.strategy.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
}
