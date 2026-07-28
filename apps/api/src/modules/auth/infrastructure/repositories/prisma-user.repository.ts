import { Prisma, type PrismaClient } from '@prisma/client';
import { buildPage, normalizePageRequest, type Page } from '../../../../shared/domain';
import type { User } from '../../domain/entities/user.entity';
import type {
  AccessControl,
  IUserRepository,
  UserListFilter,
} from '../../domain/repositories/user.repository';
import { UserMapper } from '../mappers/user.mapper';

const SORTABLE_COLUMNS = new Set(['createdAt', 'updatedAt', 'email', 'lastLoginAt', 'status']);

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? UserMapper.toDomain(row) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email: email.toLowerCase() } });
    return count > 0;
  }

  async createWithRole(user: User, roleName: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({ data: UserMapper.toCreate(user) });
      await tx.userRole.create({
        data: {
          user: { connect: { id: user.id.toString() } },
          role: { connect: { name: roleName } },
        },
      });
    });
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id.toString() },
      data: UserMapper.toUpdate(user),
    });
  }

  async getAccessControl(userId: string): Promise<AccessControl> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const roles = rows.map((r) => r.role.name);
    const permissions = new Set<string>();
    for (const ur of rows) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.key);
      }
    }
    return { roles, permissions: [...permissions] };
  }

  async list(filter: UserListFilter): Promise<Page<User>> {
    const req = normalizePageRequest(filter);
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { email: { contains: filter.search, mode: 'insensitive' } },
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = req.sortBy && SORTABLE_COLUMNS.has(req.sortBy) ? req.sortBy : 'createdAt';
    const orderBy = { [sortField]: req.sortDir } as Prisma.UserOrderByWithRelationInput;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (req.page - 1) * req.pageSize,
        take: req.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPage(rows.map(UserMapper.toDomain), total, req);
  }
}
