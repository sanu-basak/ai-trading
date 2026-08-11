import { Prisma, type PrismaClient, type UserPreferences } from '@prisma/client';
import {
  DEFAULT_SETTINGS,
  type ISettingsRepository,
  type SettingsView,
  type UpdateSettingsInput,
} from '../domain/settings.repository';

function toView(row: UserPreferences): SettingsView {
  return {
    theme: row.theme,
    baseCurrency: row.baseCurrency,
    defaultMarket: row.defaultMarket,
    defaultTimeframe: row.defaultTimeframe,
    chartType: row.chartType,
    emailNotifications: row.emailNotifications,
    pushNotifications: row.pushNotifications,
    marketingOptIn: row.marketingOptIn,
  };
}

export class PrismaSettingsRepository implements ISettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(userId: string): Promise<SettingsView> {
    const row = await this.prisma.userPreferences.findUnique({ where: { userId } });
    return row ? toView(row) : { ...DEFAULT_SETTINGS };
  }

  async upsert(userId: string, input: UpdateSettingsInput): Promise<SettingsView> {
    const merged = { ...(await this.get(userId)), ...input };
    const data = {
      theme: merged.theme,
      baseCurrency: merged.baseCurrency,
      defaultMarket: merged.defaultMarket,
      defaultTimeframe: merged.defaultTimeframe as Prisma.UserPreferencesUncheckedCreateInput['defaultTimeframe'],
      chartType: merged.chartType,
      emailNotifications: merged.emailNotifications,
      pushNotifications: merged.pushNotifications,
      marketingOptIn: merged.marketingOptIn,
    };
    const row = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toView(row);
  }
}
