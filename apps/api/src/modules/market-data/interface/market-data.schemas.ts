import { z } from 'zod';

const assetClassEnum = z.enum([
  'EQUITY',
  'INDEX',
  'ETF',
  'CRYPTO',
  'FOREX',
  'COMMODITY',
  'OPTION',
  'FUTURE',
  'BOND',
]);

const timeframeEnum = z.enum(['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']);

/** Either an instrumentId, or an explicit exchange+symbol+assetClass triple. */
const symbolRefShape = {
  instrumentId: z.string().min(1).optional(),
  exchange: z.string().trim().max(20).optional(),
  symbol: z.string().trim().max(40).optional(),
  assetClass: assetClassEnum.optional(),
};

const hasSymbol = (v: {
  instrumentId?: string;
  exchange?: string;
  symbol?: string;
  assetClass?: string;
}): boolean => Boolean(v.instrumentId || (v.exchange && v.symbol && v.assetClass));

export const quoteQuerySchema = z
  .object(symbolRefShape)
  .refine(hasSymbol, { message: 'Provide instrumentId or exchange + symbol + assetClass' });

export const candlesQuerySchema = z
  .object({
    ...symbolRefShape,
    timeframe: timeframeEnum,
    from: z.coerce.number().int().nonnegative().optional(),
    to: z.coerce.number().int().nonnegative().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
  })
  .refine(hasSymbol, { message: 'Provide instrumentId or exchange + symbol + assetClass' });

export const optionChainQuerySchema = z
  .object({
    ...symbolRefShape,
    expiry: z.coerce.number().int().positive(),
  })
  .refine(hasSymbol, { message: 'Provide instrumentId or exchange + symbol + assetClass' });
