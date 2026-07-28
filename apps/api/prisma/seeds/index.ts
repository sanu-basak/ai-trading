/**
 * Idempotent database seed: RBAC (permissions + roles), subscription plans,
 * exchanges, and a bootstrap super-admin. Safe to run repeatedly (upserts).
 *
 * Run with: `pnpm db:seed`  (or `prisma db seed`)
 *
 * The super-admin credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * In production, ALWAYS set a strong SEED_ADMIN_PASSWORD — the default is for
 * local development only.
 */
import { PrismaClient, type PlanTier } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const SUPERUSER_PERMISSION = '*';

// --- Permission catalogue: [key, resource, action, description] ---
const PERMISSIONS: Array<[string, string, string, string]> = [
  [SUPERUSER_PERMISSION, '*', '*', 'Full access to everything (superuser)'],
  ['admin:access', 'admin', 'access', 'Access the admin panel'],
  ['user:read', 'user', 'read', 'View users'],
  ['user:manage', 'user', 'manage', 'Create / update users and status'],
  ['user:delete', 'user', 'delete', 'Delete users'],
  ['billing:read', 'billing', 'read', 'View billing data'],
  ['billing:manage', 'billing', 'manage', 'Manage billing, invoices, refunds'],
  ['subscription:read', 'subscription', 'read', 'View subscriptions'],
  ['subscription:manage', 'subscription', 'manage', 'Manage subscriptions and plans'],
  ['signal:read', 'signal', 'read', 'View AI signals'],
  ['signal:create', 'signal', 'create', 'Request AI analysis / signals'],
  ['scanner:read', 'scanner', 'read', 'View scanners'],
  ['scanner:run', 'scanner', 'run', 'Run scanners'],
  ['backtest:read', 'backtest', 'read', 'View backtests'],
  ['backtest:run', 'backtest', 'run', 'Run backtests'],
  ['watchlist:read', 'watchlist', 'read', 'View watchlists'],
  ['watchlist:manage', 'watchlist', 'manage', 'Manage watchlists'],
  ['portfolio:read', 'portfolio', 'read', 'View portfolios'],
  ['portfolio:manage', 'portfolio', 'manage', 'Manage portfolios'],
  ['journal:read', 'journal', 'read', 'View trade journal'],
  ['journal:manage', 'journal', 'manage', 'Manage trade journal'],
  ['alert:read', 'alert', 'read', 'View alerts'],
  ['alert:manage', 'alert', 'manage', 'Manage alerts'],
  ['strategy:read', 'strategy', 'read', 'View strategies'],
  ['strategy:manage', 'strategy', 'manage', 'Manage strategies'],
  ['apikey:read', 'apikey', 'read', 'View API keys'],
  ['apikey:manage', 'apikey', 'manage', 'Manage API keys'],
  ['news:read', 'news', 'read', 'View news'],
];

const USER_PERMISSIONS = [
  'signal:read',
  'scanner:read',
  'scanner:run',
  'watchlist:read',
  'watchlist:manage',
  'portfolio:read',
  'portfolio:manage',
  'journal:read',
  'journal:manage',
  'alert:read',
  'alert:manage',
  'backtest:read',
  'backtest:run',
  'strategy:read',
  'strategy:manage',
  'apikey:read',
  'apikey:manage',
  'news:read',
];

// --- Roles: name → { description, isSystem, permissions } ---
const ROLES: Record<
  string,
  { description: string; isSystem: boolean; permissions: string[] }
> = {
  SUPER_ADMIN: {
    description: 'Platform owner with unrestricted access',
    isSystem: true,
    permissions: [SUPERUSER_PERMISSION],
  },
  ADMIN: {
    description: 'Administrator',
    isSystem: true,
    permissions: [
      'admin:access',
      'user:read',
      'user:manage',
      'billing:read',
      'billing:manage',
      'subscription:read',
      'subscription:manage',
      'signal:read',
      'news:read',
    ],
  },
  ANALYST: {
    description: 'Research analyst',
    isSystem: true,
    permissions: ['signal:read', 'signal:create', 'scanner:read', 'scanner:run', 'backtest:read', 'backtest:run', 'news:read'],
  },
  SUPPORT: {
    description: 'Customer support',
    isSystem: true,
    permissions: ['user:read', 'billing:read', 'subscription:read'],
  },
  USER: {
    description: 'Standard end user',
    isSystem: true,
    permissions: USER_PERMISSIONS,
  },
};

// --- Plans ---
interface PlanSeed {
  tier: PlanTier;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  trialDays: number;
  isPublic: boolean;
  sortOrder: number;
  features: string[];
  limits: Record<string, number>;
}

const PLANS: PlanSeed[] = [
  {
    tier: 'FREE',
    name: 'Free',
    slug: 'free',
    description: 'Get started with core analysis tools',
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 0,
    isPublic: true,
    sortOrder: 0,
    features: ['1 watchlist', '5 AI signals / day', 'Basic scanners'],
    limits: { watchlists: 1, aiSignalsPerDay: 5, scansPerDay: 10, backtestsPerMonth: 3, alerts: 5 },
  },
  {
    tier: 'BASIC',
    name: 'Basic',
    slug: 'basic',
    description: 'For active retail traders',
    priceMonthly: 499,
    priceYearly: 4990,
    trialDays: 7,
    isPublic: true,
    sortOrder: 1,
    features: ['5 watchlists', '25 AI signals / day', 'All scanners', 'Email alerts'],
    limits: { watchlists: 5, aiSignalsPerDay: 25, scansPerDay: 50, backtestsPerMonth: 20, alerts: 50 },
  },
  {
    tier: 'PRO',
    name: 'Pro',
    slug: 'pro',
    description: 'For serious traders and swing/positional strategies',
    priceMonthly: 1499,
    priceYearly: 14990,
    trialDays: 7,
    isPublic: true,
    sortOrder: 2,
    features: ['20 watchlists', '100 AI signals / day', 'Smart-money & options scanners', 'Telegram alerts', 'AI chat'],
    limits: { watchlists: 20, aiSignalsPerDay: 100, scansPerDay: 200, backtestsPerMonth: 100, alerts: 200 },
  },
  {
    tier: 'PREMIUM',
    name: 'Premium',
    slug: 'premium',
    description: 'Full platform with priority AI',
    priceMonthly: 2999,
    priceYearly: 29990,
    trialDays: 14,
    isPublic: true,
    sortOrder: 3,
    features: ['Unlimited watchlists', 'Unlimited AI signals', 'Priority AI', 'Vision analysis', 'All alert channels'],
    limits: { watchlists: 1000, aiSignalsPerDay: 1000, scansPerDay: 1000, backtestsPerMonth: 1000, alerts: 1000 },
  },
  {
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Custom limits, SLAs and dedicated support',
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 0,
    isPublic: false,
    sortOrder: 4,
    features: ['Custom limits', 'Dedicated support', 'SSO', 'Audit exports'],
    limits: {},
  },
];

// --- Exchanges ---
const EXCHANGES: Array<{ code: string; name: string; country: string; currency: string; timezone: string }> = [
  { code: 'NSE', name: 'National Stock Exchange of India', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'BSE', name: 'Bombay Stock Exchange', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'MCX', name: 'Multi Commodity Exchange of India', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'NASDAQ', name: 'Nasdaq Stock Market', country: 'US', currency: 'USD', timezone: 'America/New_York' },
  { code: 'NYSE', name: 'New York Stock Exchange', country: 'US', currency: 'USD', timezone: 'America/New_York' },
  { code: 'BINANCE', name: 'Binance', country: 'US', currency: 'USD', timezone: 'UTC' },
  { code: 'OANDA', name: 'OANDA (Forex)', country: 'US', currency: 'USD', timezone: 'UTC' },
];

async function seedPermissions(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [key, resource, action, description] of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { key },
      update: { resource, action, description },
      create: { key, resource, action, description },
    });
    ids.set(key, p.id);
  }
  console.log(`✓ permissions: ${ids.size}`);
  return ids;
}

async function seedRoles(permissionIds: Map<string, string>): Promise<void> {
  for (const [name, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: def.description, isSystem: def.isSystem },
      create: { name, description: def.description, isSystem: def.isSystem },
    });
    for (const permKey of def.permissions) {
      const permissionId = permissionIds.get(permKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
  console.log(`✓ roles: ${Object.keys(ROLES).length}`);
}

async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        tier: plan.tier,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        trialDays: plan.trialDays,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
        features: plan.features,
        limits: plan.limits,
      },
      create: {
        tier: plan.tier,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        trialDays: plan.trialDays,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
        features: plan.features,
        limits: plan.limits,
      },
    });
  }
  console.log(`✓ plans: ${PLANS.length}`);
}

async function seedExchanges(): Promise<void> {
  for (const ex of EXCHANGES) {
    await prisma.exchange.upsert({
      where: { code: ex.code },
      update: { name: ex.name, country: ex.country, currency: ex.currency, timezone: ex.timezone },
      create: { code: ex.code, name: ex.name, country: ex.country, currency: ex.currency, timezone: ex.timezone },
    });
  }
  console.log(`✓ exchanges: ${EXCHANGES.length}`);
}

async function seedSuperAdmin(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@devquantic.ai').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe_123!';
  const passwordHash = await hash(password, ARGON2_OPTIONS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'Super Admin',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      referralCode: createId(),
      timezone: 'Asia/Kolkata',
    },
  });

  const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (role) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }
  console.log(`✓ super-admin: ${email}`);
  if (password === 'ChangeMe_123!') {
    console.warn('  ⚠  Using the default admin password. Set SEED_ADMIN_PASSWORD before production.');
  }
}

async function main(): Promise<void> {
  console.log('Seeding DEVQUANTIC database…');
  const permissionIds = await seedPermissions();
  await seedRoles(permissionIds);
  await seedPlans();
  await seedExchanges();
  await seedSuperAdmin();
  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
