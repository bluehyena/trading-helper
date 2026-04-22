<div align="center">

# Trading Helper

### 미국 주식 단기 트레이더를 위한 로컬 AI 분석 대시보드

무료 공개 시세, 기술적 지표, 롱/숏/중립 편향, 리스크 레벨, AI 설명을 하나의 로컬 대시보드에서 봅니다.

[![CI](https://github.com/bluehyena/trading-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/bluehyena/trading-helper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f3c623.svg)](./LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-BYOK-111111?logo=openai)
![Gemini](https://img.shields.io/badge/Gemini-BYOK-7b61ff)

[![GitHub stars](https://img.shields.io/github/stars/bluehyena/trading-helper?style=social)](https://github.com/bluehyena/trading-helper/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/bluehyena/trading-helper?style=social)](https://github.com/bluehyena/trading-helper/forks)
[![GitHub watchers](https://img.shields.io/github/watchers/bluehyena/trading-helper?style=social)](https://github.com/bluehyena/trading-helper/watchers)

[English](./README.md) · [한국어](./README.ko.md)

<a href="https://github.com/bluehyena/trading-helper/archive/refs/heads/main.zip">
  <img alt="Download ZIP" src="https://img.shields.io/badge/Download-ZIP-2ea44f?style=for-the-badge&logo=github">
</a>
<a href="#빠른-시작">
  <img alt="Quick start" src="https://img.shields.io/badge/Quick_Start-3_commands-4fb99f?style=for-the-badge">
</a>
<a href="https://github.com/bluehyena/trading-helper/stargazers">
  <img alt="Star this repo" src="https://img.shields.io/badge/Star-if_useful-10100d?style=for-the-badge&logo=github">
</a>

</div>

![Trading Helper 한국어 대시보드](./figure/Korean.jpg)

## 왜 쓰기 좋은가요

| 대상 | 제공하는 것 |
| --- | --- |
| 빠르게 판단하는 재량 트레이더 | 캔들, 지표, 방향 편향, 무효화, 목표가, 리스크 맥락을 한 화면에서 확인 |
| 로컬 우선 사용자 | 내 PC에서 실행하며 API 키는 `.env`에만 보관 |
| 한국어/영어 사용자 | 대시보드에서 바로 한국어/영어 전환 |
| AI 보조 분석 | 주문 실행은 직접 유지하면서 셋업의 이유와 리스크를 질문 |

## 주요 기능

- 미국 주식 로컬 웹 대시보드: watchlist, 종목 검색, 캔들 차트, 신호 카드, 리스크 패널, AI 채팅.
- 로컬 즐겨찾기와 수동 스캐너로 저장한 종목 중 롱/숏 셋업이 좋은 후보를 정렬합니다.
- 마우스 휠 차트 축척 변경, 아이콘 확대/축소, 드래그 이동을 지원합니다.
- 일봉, 주봉, 월봉과 일반/하이킨아시 캔들 표시를 지원합니다.
- 거래량 히스토그램과 진입 구간, 손절, 1R/2R 목표가 차트 오버레이를 표시합니다.
- 대표적인 상승/하락 캔들 패턴을 감지합니다.
- 가격 표기: 영어는 USD, 한국어는 현재 USD/KRW 환율 기준 원화로 변환하고 소수점 이하는 버립니다.
- 분석 보조 전용: 브로커 연결 없음, 주문 실행 없음, 실시간 데이터 보장 없음.
- 기본 지표: EMA 9/21/50/200, VWAP, RSI 14, MACD, Bollinger Bands, ATR, 상대 거래량, OBV, 피벗 지지/저항.
- 신호 엔진: `LONG`, `SHORT`, `NEUTRAL` 편향과 신뢰도, 진입 관찰 구간, 무효화 가격, 1R/2R 목표, 근거, 경고, 데이터 시간을 제공합니다.
- BYOK AI 제공자: OpenAI, Gemini, 로컬 설명 fallback.

## 스크린샷

| English | Korean |
| --- | --- |
| ![English dashboard](./figure/English.jpg) | ![Korean dashboard](./figure/Korean.jpg) |

## 빠른 시작

### 준비물

- Node.js 24 이상
- npm 11 이상
- Git, ZIP 다운로드가 아니라 clone으로 받을 경우 필요

```bash
git clone https://github.com/bluehyena/trading-helper.git
cd trading-helper
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

### Git 없이 다운로드

1. `https://github.com/bluehyena/trading-helper`를 엽니다.
2. `Code` 버튼을 누릅니다.
3. `Download ZIP`을 누릅니다.
4. 압축을 풀고 해당 폴더에서 터미널을 연 뒤 실행합니다:

```bash
npm install
npm run dev
```

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

### 프로덕션 실행

```bash
npm run build
npm start
```

## AI 안전장치

Trading Helper는 의도적으로 분석 보조 전용입니다. AI는 셋업 설명, 지표 비교, 리스크 요약, 무효화 기준 설명을 할 수 있지만 주문 실행, 브로커 연결, 확정적 수익 보장을 제공하지 않습니다.

## 지표 배우기

기술적 지표가 익숙하지 않다면 앱 실행 후 `/learn` 페이지를 열어보세요. EMA, VWAP, RSI, MACD, Bollinger Bands, ATR, 상대 거래량, OBV, 지지/저항, 하이킨아시, 손절, risk/reward를 초보자 친화적으로 설명합니다.

## 저장소 구조

- `apps/web`: Next.js 로컬 대시보드와 API routes.
- `packages/core`: 시장 데이터 인터페이스, 지표 계산, 데이터 신선도 체크, 신호 엔진.
- `packages/ai`: OpenAI, Gemini, 로컬 fallback AI provider.
- `__tests__/e2e`: 대시보드 Playwright smoke test.

## 스크립트

```bash
npm run dev
npm run build
npm start
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## 데이터 정책

기본 provider는 별도 키 없이 접근 가능한 공개 데이터를 사용합니다. 무료 데이터는 지연, 누락, rate limit, 제3자 약관 영향을 받을 수 있으므로 UI에서 데이터 출처와 시간을 직접 표시합니다. 새로운 provider adapter도 동일한 `MarketDataProvider` 인터페이스와 데이터 신선도/출처 메타데이터를 유지해야 합니다.

## 스타 히스토리

Trading Helper가 유용하다면 star를 눌러 주세요. 다른 트레이더와 개발자가 프로젝트를 발견하는 데 큰 도움이 됩니다.

[![Star History Chart](https://api.star-history.com/svg?repos=bluehyena/trading-helper&type=Date)](https://star-history.com/#bluehyena/trading-helper&Date)

## 기여

[CONTRIBUTING.ko.md](./CONTRIBUTING.ko.md)를 참고해 주세요. 영어 문서: [CONTRIBUTING.md](./CONTRIBUTING.md).

프로젝트 운영 문서:

- [브랜치 정책](./docs/BRANCHING.md)
- [코딩 스타일](./docs/CODING_STYLE.md)

## 보안

[SECURITY.ko.md](./SECURITY.ko.md)를 참고해 주세요. 영어 문서: [SECURITY.md](./SECURITY.md).

## 중요 고지

Trading Helper는 교육 및 분석 보조용입니다. 개인화된 금융 조언, 브로커 연결, 주문 실행, 실시간 데이터 보장을 제공하지 않습니다. 투자 판단과 손실 책임은 사용자 본인에게 있으며 개발자는 투자 손실에 대해 책임지지 않습니다. 기본 데이터 경로는 비공식 Yahoo 스타일 공개 엔드포인트를 사용하므로 지연, 누락, 제한이 있을 수 있으며 연구/분석용으로만 취급해야 합니다.

## 라이선스

MIT
