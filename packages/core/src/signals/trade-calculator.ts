import { round } from "../indicators";
import type { TradeReturnInput, TradeReturnResult, TradeReturnScenario } from "../types";

export function calculateTradeReturn(input: TradeReturnInput): TradeReturnResult {
  const principal = Math.max(0, input.principal);
  const entryPrice = Math.max(0.0001, input.entryPrice);
  const shares = principal / entryPrice;
  const feeRate = Math.max(0, input.feePercent) / 100;
  const taxRate = Math.max(0, input.taxPercent) / 100;

  return {
    shares: round(shares, 4),
    takeProfit: calculateScenario(input.direction, shares, entryPrice, input.takeProfitPrice, feeRate, taxRate),
    stopLoss: calculateScenario(input.direction, shares, entryPrice, input.stopLossPrice, feeRate, taxRate),
    breakEvenPrice: round(breakEvenPrice(input.direction, entryPrice, feeRate), 4)
  };
}

function calculateScenario(
  direction: TradeReturnInput["direction"],
  shares: number,
  entryPrice: number,
  exitPrice: number,
  feeRate: number,
  taxRate: number
): TradeReturnScenario {
  const boundedExit = Math.max(0.0001, exitPrice);
  const gross = direction === "long" ? (boundedExit - entryPrice) * shares : (entryPrice - boundedExit) * shares;
  const fees = (entryPrice * shares + boundedExit * shares) * feeRate;
  const taxableProfit = Math.max(0, gross - fees);
  const taxes = taxableProfit * taxRate;
  const net = gross - fees - taxes;
  const principal = entryPrice * shares;

  return {
    exitPrice: round(boundedExit, 4),
    gross: round(gross, 2),
    fees: round(fees, 2),
    taxes: round(taxes, 2),
    net: round(net, 2),
    roiPercent: principal > 0 ? round((net / principal) * 100, 2) : 0
  };
}

function breakEvenPrice(direction: TradeReturnInput["direction"], entryPrice: number, feeRate: number): number {
  if (direction === "long") {
    return (entryPrice * (1 + feeRate)) / Math.max(0.0001, 1 - feeRate);
  }

  return (entryPrice * (1 - feeRate)) / (1 + feeRate);
}
