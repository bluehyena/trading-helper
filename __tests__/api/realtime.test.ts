import { describe, expect, it } from "vitest";
import { GET as realtimeStatus } from "../../apps/web/app/api/market/realtime/status/route";
import { GET as realtimeStream } from "../../apps/web/app/api/market/realtime/stream/route";

describe("realtime market API", () => {
  it("reports unconfigured realtime provider without exposing secrets", async () => {
    const previousProvider = process.env.REALTIME_DATA_PROVIDER;
    const previousKey = process.env.POLYGON_API_KEY;
    delete process.env.POLYGON_API_KEY;
    process.env.REALTIME_DATA_PROVIDER = "polygon";

    const response = await realtimeStatus();
    const json = (await response.json()) as { configured: boolean; provider: string; source: string };

    expect(json.configured).toBe(false);
    expect(json.provider).toBe("polygon");
    expect(JSON.stringify(json)).not.toContain(previousKey ?? "unused-secret");

    restoreEnv(previousProvider, previousKey);
  });

  it("returns a finite SSE error when realtime key is missing", async () => {
    const previousProvider = process.env.REALTIME_DATA_PROVIDER;
    const previousKey = process.env.POLYGON_API_KEY;
    delete process.env.POLYGON_API_KEY;
    process.env.REALTIME_DATA_PROVIDER = "polygon";

    const response = await realtimeStream(new Request("http://localhost/api/market/realtime/stream?symbol=QQQ&timeframe=1s"));
    const text = await response.text();

    expect(response.headers.get("content-type") ?? "").toContain("text/event-stream");
    expect(text).toContain("event: error");
    expect(text).toContain("Realtime provider is not configured");
    expect(text).not.toContain(previousKey ?? "unused-secret");

    restoreEnv(previousProvider, previousKey);
  });
});

function restoreEnv(provider: string | undefined, key: string | undefined) {
  if (provider === undefined) {
    delete process.env.REALTIME_DATA_PROVIDER;
  } else {
    process.env.REALTIME_DATA_PROVIDER = provider;
  }

  if (key === undefined) {
    delete process.env.POLYGON_API_KEY;
  } else {
    process.env.POLYGON_API_KEY = key;
  }
}
