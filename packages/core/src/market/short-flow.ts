import type {
  DarkPoolSnapshot,
  FailsToDeliverRecord,
  ShortFlowSnapshot,
  ShortInterestRecord,
  ShortSaleVolumeRecord
} from "../types";
import { fetchDarkPoolSnapshot } from "./dark-pool";

export const SHORT_FLOW_SOURCE =
  "FINRA/SEC public delayed files (short interest, Reg SHO short-sale volume, fails-to-deliver)";

export const SHORT_FLOW_LINKS = {
  finraShortVolume: "https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data/daily-short-sale-volume-files",
  finraShortInterest: "https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data",
  secFailsToDeliver: "https://www.sec.gov/data-research/sec-markets-data/fails-deliver-data"
} as const;

interface ShortFlowBuildInput {
  symbol: string;
  shortInterestRecords?: ShortInterestRecord[];
  shortSaleVolumeRecords?: ShortSaleVolumeRecord[];
  failsToDeliverRecords?: FailsToDeliverRecord[];
  darkPool?: DarkPoolSnapshot | null;
  warnings?: string[];
  now?: Date;
}

export function buildShortFlowSnapshot({
  symbol,
  shortInterestRecords = [],
  shortSaleVolumeRecords = [],
  failsToDeliverRecords = [],
  darkPool = null,
  warnings = [],
  now = new Date()
}: ShortFlowBuildInput): ShortFlowSnapshot {
  const normalized = symbol.toUpperCase();
  const shortInterest = latestByDate(shortInterestRecords.filter((record) => record.symbol === normalized), "settlementDate");
  const shortSaleVolume = latestByDate(shortSaleVolumeRecords.filter((record) => record.symbol === normalized), "date");
  const failsToDeliver = latestByDate(failsToDeliverRecords.filter((record) => record.symbol === normalized), "settlementDate");
  const missingWarnings = [
    shortInterest ? null : "Short interest is unavailable from the configured public file source.",
    shortSaleVolume ? null : "Daily short-sale volume is unavailable from the configured public file source.",
    failsToDeliver ? null : "Fails-to-deliver data is unavailable from the configured public file source."
  ].filter((item): item is string => Boolean(item));

  return {
    symbol: normalized,
    shortInterest,
    shortSaleVolume,
    failsToDeliver,
    darkPool,
    warnings: [
      "Short-related public data is delayed and must not be treated as real-time order flow.",
      ...missingWarnings,
      ...warnings
    ],
    dataTimestamp: now.toISOString(),
    source: SHORT_FLOW_SOURCE
  };
}

export function parseFinraShortInterestCsv(raw: string, source: string = SHORT_FLOW_LINKS.finraShortInterest): ShortInterestRecord[] {
  return parseDelimited(raw, ",")
    .map((row) => {
      const symbol = readField(row, ["symbol", "issueSymbol", "Symbol"]).toUpperCase();
      const settlementDate = normalizeDate(readField(row, ["settlementDate", "Settlement Date", "date"]));
      if (!symbol || !settlementDate) {
        return null;
      }

      const shortInterest = parseNumber(readField(row, ["shortInterest", "Current Short Interest", "currentShortInterest"]));
      const averageDailyVolume = parseNumber(readField(row, ["averageDailyVolume", "Average Daily Share Volume", "avgDailyShareVolume"]));
      const daysToCover =
        parseNumber(readField(row, ["daysToCover", "Days To Cover", "daysToCoverQuantity"])) ??
        (shortInterest !== null && averageDailyVolume ? shortInterest / averageDailyVolume : null);

      const record: ShortInterestRecord = {
        symbol,
        settlementDate,
        shortInterest,
        averageDailyVolume,
        daysToCover,
        source
      };
      return record;
    })
    .filter((record): record is ShortInterestRecord => record !== null);
}

export function parseFinraShortSaleVolumeCsv(raw: string, source: string = SHORT_FLOW_LINKS.finraShortVolume): ShortSaleVolumeRecord[] {
  return parseDelimited(raw, /[|,]/)
    .map((row) => {
      const symbol = readField(row, ["symbol", "Symbol", "issueSymbol", "symbolCode"]).toUpperCase();
      const date = normalizeDate(readField(row, ["date", "Date", "tradeReportDate"]));
      if (!symbol || !date) {
        return null;
      }

      const shortVolume = parseNumber(readField(row, ["shortVolume", "ShortVolume", "shortParQuantity"]));
      const totalVolume = parseNumber(readField(row, ["totalVolume", "TotalVolume", "totalParQuantity"]));
      const shortExemptVolume = parseNumber(readField(row, ["shortExemptVolume", "ShortExemptVolume", "shortExemptParQuantity"]));
      const shortVolumeRatio = shortVolume !== null && totalVolume && totalVolume > 0 ? shortVolume / totalVolume : null;

      const record: ShortSaleVolumeRecord = {
        symbol,
        date,
        shortVolume,
        totalVolume,
        shortExemptVolume,
        shortVolumeRatio,
        source
      };
      return record;
    })
    .filter((record): record is ShortSaleVolumeRecord => record !== null);
}

export function parseSecFailsToDeliverText(raw: string, source: string = SHORT_FLOW_LINKS.secFailsToDeliver): FailsToDeliverRecord[] {
  return parseDelimited(raw, "|")
    .map((row) => {
      const symbol = readField(row, ["SYMBOL", "symbol"]).toUpperCase();
      const settlementDate = normalizeDate(readField(row, ["SETTLEMENT DATE", "settlementDate"]));
      if (!symbol || !settlementDate) {
        return null;
      }

      const record: FailsToDeliverRecord = {
        symbol,
        settlementDate,
        quantity: parseNumber(readField(row, ["QUANTITY (FAILS)", "quantity", "fails"])),
        price: parseNumber(readField(row, ["PRICE", "price"])),
        source
      };
      return record;
    })
    .filter((record): record is FailsToDeliverRecord => record !== null);
}

export async function fetchShortFlowSnapshot(
  symbol: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch
): Promise<ShortFlowSnapshot> {
  const warnings: string[] = [];
  const [shortInterestCsv, shortVolumeCsv, ftdText] = await Promise.all([
    fetchOptionalText(env.FINRA_SHORT_INTEREST_CSV_URL, fetchFn, warnings, "FINRA short interest"),
    fetchOptionalText(env.FINRA_SHORT_VOLUME_CSV_URL, fetchFn, warnings, "FINRA short-sale volume"),
    fetchOptionalText(env.SEC_FTD_TXT_URL, fetchFn, warnings, "SEC fails-to-deliver")
  ]);

  const shortInterestRecords = shortInterestCsv ? parseFinraShortInterestCsv(shortInterestCsv, env.FINRA_SHORT_INTEREST_CSV_URL) : [];
  const shortSaleVolumeRecords = shortVolumeCsv ? parseFinraShortSaleVolumeCsv(shortVolumeCsv, env.FINRA_SHORT_VOLUME_CSV_URL) : [];
  const failsToDeliverRecords = ftdText ? parseSecFailsToDeliverText(ftdText, env.SEC_FTD_TXT_URL) : [];
  const normalizedSymbol = symbol.toUpperCase();
  const latestShortSaleVolume = latestByDate(
    shortSaleVolumeRecords.filter((record) => record.symbol === normalizedSymbol),
    "date"
  );
  const darkPool = await fetchDarkPoolSnapshot(normalizedSymbol, latestShortSaleVolume, fetchFn);

  return buildShortFlowSnapshot({
    symbol,
    shortInterestRecords,
    shortSaleVolumeRecords,
    failsToDeliverRecords,
    darkPool,
    warnings
  });
}

async function fetchOptionalText(
  url: string | undefined,
  fetchFn: typeof fetch,
  warnings: string[],
  label: string
): Promise<string | null> {
  if (!url) {
    warnings.push(`${label} file URL is not configured. Add a public file URL to enable parsed values.`);
    return null;
  }

  try {
    const response = await fetchFn(url, {
      headers: {
        Accept: "text/plain,text/csv,*/*",
        "User-Agent": "trading-helper/0.1"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    warnings.push(`${label} fetch failed: ${error instanceof Error ? error.message : "unknown error"}.`);
    return null;
  }
}

function parseDelimited(raw: string, delimiter: string | RegExp): Array<Record<string, string>> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const split = (line: string) => line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0]);
  return lines.slice(1).map((line) => {
    const values = split(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function readField(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    if (row[name] !== undefined) {
      return row[name];
    }
  }

  const lower = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]));
  for (const name of names) {
    const value = lower[name.toLowerCase()];
    if (value !== undefined) {
      return value;
    }
  }

  return "";
}

function parseNumber(value: string): number | null {
  const normalized = value.replace(/[$,%\s]/g, "").replace(/,/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed;
}

function latestByDate<T extends Record<K, string>, K extends keyof T>(records: T[], dateKey: K): T | null {
  if (records.length === 0) {
    return null;
  }

  return [...records].sort((left, right) => String(right[dateKey]).localeCompare(String(left[dateKey])))[0];
}
