import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST as agentScan } from "../../apps/web/app/api/agent/scan/route";
import { POST as actionPreview } from "../../apps/web/app/api/ai/actions/preview/route";
import { GET as shortFlow } from "../../apps/web/app/api/market/short-flow/route";
import { GET as getState, PUT as putState } from "../../apps/web/app/api/state/route";

let tempDir: string | null = null;
let previousStatePath: string | undefined;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
  if (previousStatePath === undefined) {
    delete process.env.TRADING_HELPER_STATE_PATH;
  } else {
    process.env.TRADING_HELPER_STATE_PATH = previousStatePath;
  }
});

describe("state and agent APIs", () => {
  it("persists sanitized user state to a local JSON file", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "trading-helper-"));
    previousStatePath = process.env.TRADING_HELPER_STATE_PATH;
    process.env.TRADING_HELPER_STATE_PATH = path.join(tempDir, "state.json");

    const saved = await putState(
      new Request("http://localhost/api/state", {
        method: "PUT",
        body: JSON.stringify({
          locale: "en",
          favorites: ["msft", "MSFT", "QQQ"],
          lastSymbol: "msft",
          timeframe: "1d",
          horizon: "swing",
          OPENAI_API_KEY: "should-not-persist"
        })
      })
    );
    const savedJson = await saved.json();
    const loaded = await getState();
    const loadedJson = await loaded.json();

    expect(savedJson.favorites).toEqual(["MSFT", "QQQ"]);
    expect(loadedJson.horizon).toBe("swing");
    expect(JSON.stringify(loadedJson)).not.toContain("should-not-persist");
  });

  it("returns degraded short-flow data without exposing keys", async () => {
    delete process.env.FINRA_SHORT_INTEREST_CSV_URL;
    delete process.env.FINRA_SHORT_VOLUME_CSV_URL;
    delete process.env.SEC_FTD_TXT_URL;

    const response = await shortFlow(new Request("http://localhost/api/market/short-flow?symbol=AAPL"));
    const json = await response.json();

    expect(json.symbol).toBe("AAPL");
    expect(json.warnings.length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain("API_KEY");
  });

  it("previews AI dashboard actions without applying them", async () => {
    const response = await actionPreview(
      new Request("http://localhost/api/ai/actions/preview", {
        method: "POST",
        body: JSON.stringify({ message: "MSFT 즐겨찾기에 추가해줘", horizon: "scalp" })
      })
    );
    const json = await response.json();

    expect(json.proposals[0]).toMatchObject({ type: "add_favorite", symbol: "MSFT" });
  });

  it("returns an empty agent report when the provided universe has no valid symbols", async () => {
    const response = await agentScan(
      new Request("http://localhost/api/agent/scan", {
        method: "POST",
        body: JSON.stringify({ symbols: [""], locale: "en", horizon: "swing" })
      })
    );
    const json = await response.json();

    expect(json.horizon).toBe("swing");
    expect(json.candidates).toEqual([]);
    expect(json.report.summary).toContain("No candidates");
  });
});
