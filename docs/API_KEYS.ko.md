# API 키와 공개 데이터 설정

Trading Helper는 기본적으로 유료 서비스 없이 실행됩니다. API 키는 선택 사항이며 로컬 `.env` 파일에만 저장됩니다.

## 기본 무료 데이터

| 출처 | 키 필요 | 참고 |
| --- | --- | --- |
| Yahoo 스타일 공개 엔드포인트 | 없음 | 비공식, 지연/최선형, 리서치용으로 취급해야 합니다. |
| FINRA 일별 공매도 거래량 | 없음 | 지연 공개 데이터이며 short-sale volume은 short interest와 다릅니다. |
| FINRA equity short interest | 공개 앱 키 없음 | 결제일 기준의 지연 포지션 데이터입니다. |
| SEC fails-to-deliver | 없음 | 지연 공개되는 pipe-delimited 원천 파일입니다. |
| Cboe put/call 데이터 | 공개 파일 URL이면 키 없음 | 시장 심리 보조 입력입니다. |

## 선택 API 키

| 제공자 | 환경변수 | 비용 참고 |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | 토큰 과금형 API입니다. 사용 전 최신 가격을 확인하세요. |
| Gemini | `GEMINI_API_KEY` | 조건에 맞는 프로젝트는 무료 tier가 있으나 모델별 rate limit이 있고, paid tier는 Cloud Billing을 사용합니다. |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | 무료 키가 있지만 사용량 제한과 premium 전용 기능이 있습니다. |
| Polygon/Massive | `POLYGON_API_KEY` | `1s/5s/15s` 캔들, 체결창, bid/ask spread에 필요합니다. 실시간/지연 여부는 사용자의 플랜에 따라 달라집니다. |

## 설정 방법

1. `.env.example`을 `.env`로 복사합니다.
2. 사용할 제공자 키만 입력합니다.
3. `npm run dev`를 다시 시작합니다.

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
ALPHA_VANTAGE_API_KEY=
REALTIME_DATA_PROVIDER=polygon
POLYGON_API_KEY=
```

선택 공개 파일 URL:

```bash
FINRA_SHORT_INTEREST_CSV_URL=
FINRA_SHORT_VOLUME_CSV_URL=
SEC_FTD_TXT_URL=
CBOE_PUT_CALL_RATIO_CSV_URL=
```

파일 URL이 비어 있어도 앱은 Short Flow 패널을 보여주며, 공식 출처 링크와 unavailable 경고를 표시합니다.

## 공식 참고 문서

- OpenAI quickstart/API key: https://platform.openai.com/docs/quickstart
- OpenAI API pricing: https://platform.openai.com/docs/pricing
- Gemini API key: https://ai.google.dev/tutorials/setup
- Gemini billing: https://ai.google.dev/gemini-api/docs/billing/
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/quota
- Gemini pricing: https://ai.google.dev/pricing
- Alpha Vantage documentation: https://www.alphavantage.co/documentation/
- Alpha Vantage premium: https://www.alphavantage.co/premium/
- Polygon stocks WebSocket: https://polygon.io/docs/stocks/ws_getting-started
- FINRA Reg SHO daily short-sale volume: https://developer.finra.org/docs/api-explorer/query_api-equity-reg_sho_daily_short_sale_volume
- FINRA equity short interest data: https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data
- SEC fails-to-deliver data: https://www.sec.gov/data-research/sec-markets-data/fails-deliver-data
