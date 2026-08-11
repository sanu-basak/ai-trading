export interface SettingsView {
  theme: string;
  baseCurrency: string;
  defaultMarket: string;
  defaultTimeframe: string;
  chartType: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingOptIn: boolean;
}

export type UpdateSettingsInput = Partial<SettingsView>;

export const DEFAULT_SETTINGS: SettingsView = {
  theme: 'system',
  baseCurrency: 'INR',
  defaultMarket: 'NSE',
  defaultTimeframe: 'D1',
  chartType: 'candles',
  emailNotifications: true,
  pushNotifications: true,
  marketingOptIn: false,
};

export interface ISettingsRepository {
  get(userId: string): Promise<SettingsView>;
  upsert(userId: string, input: UpdateSettingsInput): Promise<SettingsView>;
}
