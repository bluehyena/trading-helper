import { round } from "../indicators";
import type { DarkPoolSnapshot, DarkPoolTier, ShortSaleVolumeRecord } from "../types";

export const DARK_POOL_SOURCE =
  "FINRA OTC ATS weekly summary API (delayed public ATS/dark-pool volume)";

const FINRA_OTC_API_ROOT = "https://api.finra.org/data/group/otcMarket/name";
const ATS_SUMMARY_TYPE = "ATS_W_SMBL";
const DARK_POOL_TIERS: DarkPoolTier[] = ["T1", "T2", "OTCE"];

interface FinraWeekRecord {
  weekStartDate?: string;
}

interface FinraWeeklySummaryRecord {
  issueSymbolIdentifier?: string;
  issueName?: string;
  totalWeeklyShareQuantity?: number | string;
  totalWeeklyTradeCount?: number | string;
  lastUpdateDate?: string;
}

interface BuildDarkPoolInput {
  symbol: string;
  weekStartDate?: string | null;
  tier?: DarkPoolTier | null;
  totalWeeklyShares?: number | null;
  totalWeeklyTrades?: number | null;
  lastUpdateDate?: string | null;
  shortSaleVolume?: ShortSaleVolumeRecord | null;
  warnings?: string[];
  now?: Date;
}

export function buildDarkPoolSnapshot({
  symbol,
  weekStartDate = null,
  tier = null,
  totalWeeklyShares = null,
  totalWeeklyTrades = null,
  lastUpdateDate = null,
  shortSaleVolume = null,
  warnings = [],
  now = new Date()
}: BuildDarkPoolInput): DarkPoolSnapshot {
  const normalized = symbol.toUpperCase();
  const shortVolume = shortSaleVolume?.shortVolume ?? null;
  const atsToShortVolumeRatio =
    totalWeeklyShares !== null && shortVolume !== null && shortVolume > 0
      ? totalWeeklyShares / shortVolume
      : null;

  return {
    symbol: normalized,
    weekStartDate,
    tier,
    totalWeeklyShares: roundedOrNull(totalWeeklyShares, 0),
    totalWeeklyTrades: roundedOrNull(totalWeeklyTrades, 0),
    lastUpdateDate,
    atsToShortVolumeRatio: roundedOrNull(atsToShortVolumeRatio, 2),
    atsShareOfShortVolumePercent:
      atsToShortVolumeRatio !== null ? round(atsToShortVolumeRatio * 100, 1) : null,
    warnings: [
      "ATS/dark-pool data is delayed weekly public data and is not real-time hidden liquidity.",
      shortSaleVolume
        ? "ATS shares and FINRA daily short volume come from different delayed datasets, so the ratio is only a proxy."
        : "Short-volume reference data was unavailable, so ATS-to-short proxy ratio could not be computed.",
      ...warnings
    ],
    dataTimestamp: now.toISOString(),
    source: DARK_POOL_SOURCE
  };
}

export async function fetchDarkPoolSnapshot(
  symbol: string,
  shortSaleVolume: ShortSaleVolumeRecord | null = null,
  fetchFn: typeof fetch = fetch
): Promise<DarkPoolSnapshot> {
  const normalized = symbol.trim().toUpperCase();
  const warnings: string[] = [];

  for (const tier of DARK_POOL_TIERS) {
    const latestWeek = await fetchLatestWeekStartDate(tier, fetchFn, warnings);
    if (!latestWeek) {
      continue;
    }

    const summary = await fetchWeeklySummary(normalized, tier, latestWeek, fetchFn, warnings);
    if (!summary) {
      continue;
    }

    return buildDarkPoolSnapshot({
      symbol: normalized,
      weekStartDate: latestWeek,
      tier,
      totalWeeklyShares: parseNumber(summary.totalWeeklyShareQuantity),
      totalWeeklyTrades: parseNumber(summary.totalWeeklyTradeCount),
      lastUpdateDate: normalizeDate(summary.lastUpdateDate) ?? summary.lastUpdateDate ?? null,
      shortSaleVolume,
      warnings
    });
  }

  return buildDarkPoolSnapshot({
    symbol: normalized,
    shortSaleVolume,
    warnings: [
      "No ATS weekly summary record was found for the symbol in the latest published FINRA tiers.",
      ...warnings
    ]
  });
}

async function fetchLatestWeekStartDate(
  tier: DarkPoolTier,
  fetchFn: typeof fetch,
  warnings: string[]
): Promise<string | null> {
  try {
    const records = await postFinra<FinraWeekRecord[]>(
      "weeklyDownloadDetails",
      {
        quoteValues: false,
        delimiter: "|",
        limit: 1,
        fields: ["weekStartDate"],
        sortFields: ["-weekStartDate"],
        compareFilters: [
          { fieldName: "summaryTypeCode", fieldValue: ATS_SUMMARY_TYPE, compareType: "EQUAL" },
          { fieldName: "tierIdentifier", fieldValue: tier, compareType: "EQUAL" }
        ]
      },
      fetchFn
    );

    const weekStartDate = records[0]?.weekStartDate ?? null;
    return weekStartDate ? normalizeDate(weekStartDate) ?? weekStartDate : null;
  } catch (error) {
    warnings.push(`FINRA ATS latest-week lookup failed for ${tier}: ${error instanceof Error ? error.message : "unknown error"}.`);
    return null;
  }
}

async function fetchWeeklySummary(
  symbol: string,
  tier: DarkPoolTier,
  weekStartDate: string,
  fetchFn: typeof fetch,
  warnings: string[]
): Promise<FinraWeeklySummaryRecord | null> {
  try {
    const records = await postFinra<FinraWeeklySummaryRecord[]>(
      "weeklySummary",
      {
        quoteValues: false,
        delimiter: "|",
        limit: 1,
        fields: [
          "issueSymbolIdentifier",
          "issueName",
          "totalWeeklyShareQuantity",
          "totalWeeklyTradeCount",
          "lastUpdateDate"
        ],
        compareFilters: [
          { fieldName: "weekStartDate", fieldValue: weekStartDate, compareType: "EQUAL" },
          { fieldName: "tierIdentifier", fieldValue: tier, compareType: "EQUAL" },
          { fieldName: "summaryTypeCode", fieldValue: ATS_SUMMARY_TYPE, compareType: "EQUAL" },
          { fieldName: "issueSymbolIdentifier", fieldValue: symbol, compareType: "EQUAL" }
        ]
      },
      fetchFn
    );

    return records[0] ?? null;
  } catch (error) {
    warnings.push(`FINRA ATS weekly summary fetch failed for ${symbol}/${tier}: ${error instanceof Error ? error.message : "unknown error"}.`);
    return null;
  }
}

async function postFinra<T>(dataset: string, body: Record<string, unknown>, fetchFn: typeof fetch): Promise<T> {
  const response = await fetchFn(`${FINRA_OTC_API_ROOT}/${dataset}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "trading-helper/0.1"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundedOrNull(value: number | null | undefined, digits: number): number | null {
  return typeof value === "number" && Number.isFinite(value) ? round(value, digits) : null;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
