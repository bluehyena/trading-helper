# API Keys and Public Data Setup

Trading Helper runs without paid services by default. API keys are optional and stay in your local `.env` file.

## What Is Free by Default

| Source | Key Required | Notes |
| --- | --- | --- |
| Yahoo-style public endpoints | No | Unofficial, delayed/best-effort, research-use only. |
| FINRA short-sale volume files | No | Delayed public data; short-sale volume is not the same as short interest. |
| FINRA equity short interest files/API | No public app key | Delayed settlement-date position data. |
| SEC fails-to-deliver files | No | Public pipe-delimited files, published with delay. |
| Cboe put/call data | No key if using a public file URL | Optional sentiment input. |

## Optional Keys

| Provider | Env Var | Cost Note |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | Token-billed API. Check current pricing before use. |
| Gemini | `GEMINI_API_KEY` | Free tier exists for eligible projects, with model-specific rate limits; paid tier uses Cloud Billing. |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | Free key available, but usage limits and premium-only features apply. |
| Polygon/Massive | `POLYGON_API_KEY` | Required for `1s/5s/15s` candles, Time & Sales, and bid/ask spread. Realtime/delayed access depends on your plan. |

## Setup

1. Copy `.env.example` to `.env`.
2. Add only the providers you want to use.
3. Restart `npm run dev`.

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
ALPHA_VANTAGE_API_KEY=
REALTIME_DATA_PROVIDER=polygon
POLYGON_API_KEY=
```

Optional delayed public file URLs:

```bash
FINRA_SHORT_INTEREST_CSV_URL=
FINRA_SHORT_VOLUME_CSV_URL=
SEC_FTD_TXT_URL=
CBOE_PUT_CALL_RATIO_CSV_URL=
```

If these file URLs are blank, the app still shows the Short Flow panel with source links and unavailable warnings.

## Official References

- OpenAI quickstart and API keys: https://platform.openai.com/docs/quickstart
- OpenAI API pricing: https://platform.openai.com/docs/pricing
- Gemini API keys: https://ai.google.dev/tutorials/setup
- Gemini billing: https://ai.google.dev/gemini-api/docs/billing/
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/quota
- Gemini pricing: https://ai.google.dev/pricing
- Alpha Vantage documentation: https://www.alphavantage.co/documentation/
- Alpha Vantage premium limits: https://www.alphavantage.co/premium/
- Polygon stocks WebSocket: https://polygon.io/docs/stocks/ws_getting-started
- FINRA Reg SHO daily short-sale volume: https://developer.finra.org/docs/api-explorer/query_api-equity-reg_sho_daily_short_sale_volume
- FINRA equity short interest data: https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data
- SEC fails-to-deliver data: https://www.sec.gov/data-research/sec-markets-data/fails-deliver-data
