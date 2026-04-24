import yahooFinance from "yahoo-finance2";
import { clamp, round } from "../indicators";
import type { OptionContractSide, OptionFlowContract, OptionSentimentSnapshot, SignalBias } from "../types";
import {
  buildOptionStrategyRecommendations,
  classifyOptionVolatilityRegime,
  summarizeVolatilityRegime
} from "./options-strategies";

export const OPTIONS_SOURCE =
  "Yahoo Finance public options chain via yahoo-finance2 (unofficial, delayed/best-effort, research-use)";

interface RawOptionContract {
  contractSymbol?: string;
  strike?: number;
  lastPrice?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
  expiration?: string | Date;
}

interface BuildOptionSentimentInput {
  symbol: string;
  expiration: string | null;
  underlyingPrice: number | null;
  calls?: RawOptionContract[];
  puts?: RawOptionContract[];
  warnings?: string[];
  now?: Date;
}

interface YahooOptionsResult {
  quote?: {
    regularMarketPrice?: number;
    preMarketPrice?: number;
  };
  options?: Array<{
    expirationDate?: Date | string;
    calls?: RawOptionContract[];
    puts?: RawOptionContract[];
  }>;
  expirationDates?: Array<Date | string>;
}

export function buildOptionSentimentSnapshot({
  symbol,
  expiration,
  underlyingPrice,
  calls = [],
  puts = [],
  warnings = [],
  now = new Date()
}: BuildOptionSentimentInput): OptionSentimentSnapshot {
  const normalizedSymbol = symbol.toUpperCase();
  const normalizedCalls = normalizeContracts(calls, "CALL", underlyingPrice);
  const normalizedPuts = normalizeContracts(puts, "PUT", underlyingPrice);
  const nearCalls = pickNearestContracts(normalizedCalls);
  const nearPuts = pickNearestContracts(normalizedPuts);
  const callVolume = sumNullable(normalizedCalls.map((contract) => contract.volume));
  const putVolume = sumNullable(normalizedPuts.map((contract) => contract.volume));
  const callOpenInterest = sumNullable(normalizedCalls.map((contract) => contract.openInterest));
  const putOpenInterest = sumNullable(normalizedPuts.map((contract) => contract.openInterest));
  const putCallVolumeRatio = ratio(putVolume, callVolume);
  const putCallOpenInterestRatio = ratio(putOpenInterest, callOpenInterest);
  const atmCall = pickAtTheMoneyContract(normalizedCalls, underlyingPrice);
  const atmPut = pickAtTheMoneyContract(normalizedPuts, underlyingPrice);
  const impliedVolatilitySkew =
    atmPut?.impliedVolatility !== null &&
    atmPut?.impliedVolatility !== undefined &&
    atmCall?.impliedVolatility !== null &&
    atmCall?.impliedVolatility !== undefined
      ? atmPut.impliedVolatility - atmCall.impliedVolatility
      : null;
  const volatilityRegime = classifyOptionVolatilityRegime(atmCall?.impliedVolatility ?? null, atmPut?.impliedVolatility ?? null);

  const reasons: string[] = [];
  let score = 0;

  if (putCallVolumeRatio !== null) {
    if (putCallVolumeRatio <= 0.85) {
      score += 1.1;
      reasons.push(`Call-heavy front expiry flow (put/call volume ${round(putCallVolumeRatio, 2)}).`);
    } else if (putCallVolumeRatio >= 1.2) {
      score -= 1.1;
      reasons.push(`Put-heavy front expiry flow (put/call volume ${round(putCallVolumeRatio, 2)}).`);
    } else {
      reasons.push(`Put/call volume is balanced near ${round(putCallVolumeRatio, 2)}.`);
    }
  }

  if (putCallOpenInterestRatio !== null) {
    if (putCallOpenInterestRatio <= 0.9) {
      score += 0.8;
      reasons.push(`Call open interest leads near-term positioning (${round(putCallOpenInterestRatio, 2)}).`);
    } else if (putCallOpenInterestRatio >= 1.15) {
      score -= 0.8;
      reasons.push(`Put open interest leads near-term positioning (${round(putCallOpenInterestRatio, 2)}).`);
    }
  }

  if (impliedVolatilitySkew !== null) {
    if (impliedVolatilitySkew >= 0.03) {
      score -= 0.4;
      reasons.push(`ATM put implied volatility is richer than ATM calls by ${round(impliedVolatilitySkew, 3)}.`);
    } else if (impliedVolatilitySkew <= -0.03) {
      score += 0.4;
      reasons.push(`ATM call implied volatility is richer than ATM puts by ${round(Math.abs(impliedVolatilitySkew), 3)}.`);
    }
  }

  const bias: SignalBias = score >= 1.2 ? "LONG" : score <= -1.2 ? "SHORT" : "NEUTRAL";
  const confidence =
    normalizedCalls.length === 0 && normalizedPuts.length === 0
      ? 20
      : bias === "NEUTRAL"
        ? clamp(Math.round(34 + Math.abs(score) * 12), 22, 54)
        : clamp(Math.round(48 + Math.abs(score) * 16), 42, 84);

  const missingWarnings = [
    normalizedCalls.length === 0 ? "Call-chain data is unavailable for the selected expiry." : null,
    normalizedPuts.length === 0 ? "Put-chain data is unavailable for the selected expiry." : null
  ].filter((item): item is string => Boolean(item));
  const strategyRecommendations = buildOptionStrategyRecommendations({
    underlyingPrice,
    expiration,
    calls: nearCalls,
    puts: nearPuts,
    bias,
    volatilityRegime
  });

  return {
    symbol: normalizedSymbol,
    expiration,
    underlyingPrice,
    callVolume,
    putVolume,
    callOpenInterest,
    putOpenInterest,
    putCallVolumeRatio: roundedOrNull(putCallVolumeRatio, 2),
    putCallOpenInterestRatio: roundedOrNull(putCallOpenInterestRatio, 2),
    atmCallImpliedVolatility: roundedOrNull(atmCall?.impliedVolatility ?? null, 4),
    atmPutImpliedVolatility: roundedOrNull(atmPut?.impliedVolatility ?? null, 4),
    impliedVolatilitySkew: roundedOrNull(impliedVolatilitySkew, 4),
    volatilityRegime,
    bias,
    confidence,
    reasons: reasons.length > 0 ? reasons : ["No strong front-expiry call/put imbalance is visible."],
    warnings: [
      "Options data is delayed/best-effort context and must not be treated as execution guidance.",
      summarizeVolatilityRegime(volatilityRegime),
      ...missingWarnings,
      ...warnings
    ],
    nearCalls,
    nearPuts,
    strategyRecommendations,
    topCalls: pickDisplayContracts(normalizedCalls),
    topPuts: pickDisplayContracts(normalizedPuts),
    dataTimestamp: now.toISOString(),
    source: OPTIONS_SOURCE
  };
}

export async function fetchOptionSentimentSnapshot(symbol: string): Promise<OptionSentimentSnapshot> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const result = (await yahooFinance.options(normalized)) as YahooOptionsResult;
    const selectedExpiry = pickFrontExpiration(result.options ?? [], result.expirationDates ?? []);
    const underlyingPrice = firstFinite(
      result.quote?.regularMarketPrice,
      result.quote?.preMarketPrice
    );

    return buildOptionSentimentSnapshot({
      symbol: normalized,
      expiration: selectedExpiry?.expiration ?? null,
      underlyingPrice,
      calls: selectedExpiry?.calls ?? [],
      puts: selectedExpiry?.puts ?? [],
      warnings:
        underlyingPrice === null
          ? ["Underlying price was unavailable, so distance-to-spot metrics are limited."]
          : []
    });
  } catch (error) {
    return buildOptionSentimentSnapshot({
      symbol: normalized,
      expiration: null,
      underlyingPrice: null,
      warnings: [
        `Options fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`
      ]
    });
  }
}

function normalizeContracts(
  contracts: RawOptionContract[],
  side: OptionContractSide,
  underlyingPrice: number | null
): OptionFlowContract[] {
  return contracts
    .map((contract) => {
      const strike = finiteOrNull(contract.strike);
      if (strike === null) {
        return null;
      }

      return {
        contractSymbol: contract.contractSymbol ?? `${side}-${strike}`,
        side,
        strike,
        expiration: toIsoDate(contract.expiration) ?? "",
        lastPrice: finiteOrNull(contract.lastPrice),
        volume: finiteOrNull(contract.volume),
        openInterest: finiteOrNull(contract.openInterest),
        impliedVolatility: finiteOrNull(contract.impliedVolatility),
        inTheMoney: Boolean(contract.inTheMoney),
        distanceFromSpotPercent:
          underlyingPrice !== null && underlyingPrice > 0
            ? Math.abs(strike - underlyingPrice) / underlyingPrice
            : null
      } satisfies OptionFlowContract;
    })
    .filter((contract): contract is OptionFlowContract => contract !== null);
}

function pickDisplayContracts(contracts: OptionFlowContract[]): OptionFlowContract[] {
  return [...contracts]
    .sort((left, right) => contractScore(right) - contractScore(left))
    .slice(0, 3);
}

function pickNearestContracts(contracts: OptionFlowContract[]): OptionFlowContract[] {
  return [...contracts]
    .sort((left, right) => {
      const distanceGap = (left.distanceFromSpotPercent ?? Number.MAX_SAFE_INTEGER) - (right.distanceFromSpotPercent ?? Number.MAX_SAFE_INTEGER);
      if (distanceGap !== 0) {
        return distanceGap;
      }
      return left.strike - right.strike;
    })
    .slice(0, 6);
}

function contractScore(contract: OptionFlowContract): number {
  return (contract.volume ?? 0) * 1.3 + (contract.openInterest ?? 0) * 0.35 - (contract.distanceFromSpotPercent ?? 1) * 1000;
}

function pickAtTheMoneyContract(
  contracts: OptionFlowContract[],
  underlyingPrice: number | null
): OptionFlowContract | null {
  if (contracts.length === 0) {
    return null;
  }

  if (underlyingPrice === null) {
    return contracts[0];
  }

  return [...contracts].sort(
    (left, right) => (left.distanceFromSpotPercent ?? Number.MAX_SAFE_INTEGER) - (right.distanceFromSpotPercent ?? Number.MAX_SAFE_INTEGER)
  )[0] ?? null;
}

function pickFrontExpiration(
  options: Array<{ expirationDate?: Date | string; calls?: RawOptionContract[]; puts?: RawOptionContract[] }>,
  fallbackDates: Array<Date | string>
): { expiration: string; calls: RawOptionContract[]; puts: RawOptionContract[] } | null {
  const dated = options
    .map((entry) => ({
      expiration: toIsoDate(entry.expirationDate),
      calls: entry.calls ?? [],
      puts: entry.puts ?? []
    }))
    .filter((entry): entry is { expiration: string; calls: RawOptionContract[]; puts: RawOptionContract[] } => Boolean(entry.expiration));

  if (dated.length > 0) {
    return [...dated].sort((left, right) => left.expiration.localeCompare(right.expiration))[0];
  }

  const fallback = fallbackDates.map((value) => toIsoDate(value)).find((value): value is string => Boolean(value));
  return fallback
    ? {
        expiration: fallback,
        calls: [],
        puts: []
      }
    : null;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numeric.length === 0) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0);
}

function roundedOrNull(value: number | null | undefined, digits: number): number | null {
  return typeof value === "number" && Number.isFinite(value) ? round(value, digits) : null;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstFinite(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
