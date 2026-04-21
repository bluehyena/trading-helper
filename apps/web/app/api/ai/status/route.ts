import { NextResponse } from "next/server";
import { getAiProviderStatus } from "@trading-helper/ai";

export async function GET() {
  return NextResponse.json(getAiProviderStatus());
}
