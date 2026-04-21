# Trading Helper

[English README](./README.md)

Trading Helper는 미국 주식 단기 트레이더를 위한 로컬 오픈소스 분석 대시보드입니다. 무료 공개 데이터, 기술적 지표, 규칙 기반 롱/숏/중립 신호 엔진, OpenAI/Gemini 개인 키 기반 AI 설명을 한 화면에 묶습니다.

## 주요 기능

- 미국 주식 로컬 웹 대시보드: watchlist, 종목 검색, 캔들 차트, 신호 카드, 리스크 패널, AI 채팅.
- 분석 보조 전용: 브로커 연결 없음, 주문 실행 없음, 실시간 데이터 보장 없음.
- 기본 지표: EMA 9/21/50/200, VWAP, RSI 14, MACD, Bollinger Bands, ATR, 상대 거래량, OBV, 피벗 지지/저항.
- 신호 엔진: `LONG`, `SHORT`, `NEUTRAL` 편향과 신뢰도, 진입 관찰 구간, 무효화 가격, 1R/2R 목표, 근거, 경고, 데이터 시간을 제공합니다.
- 한국어/영어 UI 전환 지원.
- BYOK AI 제공자: OpenAI, Gemini, 로컬 설명 fallback.

## 중요 고지

Trading Helper는 교육 및 분석 보조용입니다. 개인화된 금융 조언, 브로커 연결, 주문 실행, 실시간 데이터 보장을 제공하지 않습니다. 기본 데이터 경로는 비공식 Yahoo 스타일 공개 엔드포인트를 사용하므로 지연, 누락, 제한이 있을 수 있으며 연구/분석용으로만 취급해야 합니다.

## 빠른 시작

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

선택적 AI/시장 데이터 키:

```bash
cp .env.example .env
```

필요한 키만 설정합니다:

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
MARKET_DATA_PROVIDER=yahoo
# MARKET_DATA_PROVIDER=alpha_vantage
ALPHA_VANTAGE_API_KEY=
```

## 스크립트

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## 저장소 구조

- `apps/web`: Next.js 로컬 대시보드와 API routes.
- `packages/core`: 시장 데이터 인터페이스, 지표 계산, 데이터 신선도 체크, 신호 엔진.
- `packages/ai`: OpenAI, Gemini, 로컬 fallback AI provider.
- `__tests__/e2e`: 대시보드 Playwright smoke test.

## 데이터 정책

기본 provider는 별도 키 없이 접근 가능한 공개 데이터를 사용합니다. 무료 데이터는 지연, 누락, rate limit, 제3자 약관 영향을 받을 수 있으므로 UI에서 데이터 출처와 시간을 직접 표시합니다. 새로운 provider adapter도 동일한 `MarketDataProvider` 인터페이스와 데이터 신선도/출처 메타데이터를 유지해야 합니다.

## 기여

[CONTRIBUTING.ko.md](./CONTRIBUTING.ko.md)를 참고해 주세요. 영어 문서: [CONTRIBUTING.md](./CONTRIBUTING.md).

## 보안

[SECURITY.ko.md](./SECURITY.ko.md)를 참고해 주세요. 영어 문서: [SECURITY.md](./SECURITY.md).

## 라이선스

MIT
