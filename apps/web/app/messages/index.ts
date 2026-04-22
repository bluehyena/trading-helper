import type { AppLocale, SignalBias } from "@trading-helper/core";

export const messages = {
  ko: {
    appName: "Trading Helper",
    tagline: "미국 주식 단타 분석 대시보드",
    disclaimer:
      "분석 보조 전용. 주문 실행 없음. 무료 공개 데이터는 지연/누락될 수 있습니다. 투자 판단과 손실 책임은 사용자 본인에게 있으며 개발자는 투자 손실에 대해 책임지지 않습니다.",
    nav: {
      dashboard: "대시보드",
      learn: "지표 배우기"
    },
    language: {
      label: "언어",
      ko: "한국어",
      en: "English"
    },
    aria: {
      symbolSearch: "종목 검색",
      refresh: "새로고침",
      timeframe: "시간 프레임",
      indicators: "지표 표시"
    },
    errors: {
      candles: "캔들 데이터를 불러오지 못했습니다.",
      market: "데이터를 불러오지 못했습니다.",
      loading: "데이터 갱신 중...",
      realtime: "실시간 스트림을 불러오지 못했습니다.",
      realtimeKey: "초단위 캔들은 POLYGON_API_KEY 설정이 필요합니다.",
      realtimeWaiting: "실시간 체결을 기다리는 중..."
    },
    chart: {
      noData: "차트 데이터가 없습니다.",
      ariaLabel: "캔들 차트",
      zoomIn: "확대",
      zoomOut: "축소",
      resetZoom: "차트 초기화"
    },
    chartControls: {
      candleStyle: "캔들",
      regular: "일반",
      heikinAshi: "하이킨아시",
      overlays: "타점 표시"
    },
    signal: {
      loading: "신호 로딩",
      title: "Signal",
      bias: {
        LONG: "롱 우위",
        SHORT: "숏 우위",
        NEUTRAL: "중립"
      } satisfies Record<SignalBias, string>,
      entry: "진입 관찰",
      wait: "관망",
      invalidation: "무효화",
      target: "목표",
      data: "데이터"
    },
    scanner: {
      title: "즐겨찾기 스캐너",
      add: "즐겨찾기 추가",
      remove: "즐겨찾기 제거",
      empty: "즐겨찾기를 추가하면 여기서 수동 스캔할 수 있습니다.",
      scan: "즐겨찾기 스캔",
      scanning: "스캔 중...",
      score: "점수",
      stop: "손절",
      entry: "타점",
      age: "데이터",
      minutes: "분 전",
      patterns: "패턴",
      chartPatterns: "차트형태",
      error: "스캔 실패"
    },
    risk: {
      loading: "리스크 로딩",
      title: "지표 스냅샷"
    },
    ai: {
      title: "핀테크 분석 챗",
      providerAria: "AI 제공자",
      openAiNoKey: "OpenAI 키 없음",
      geminiNoKey: "Gemini 키 없음",
      initial: "분석할 종목을 불러오면 현재 신호와 지표를 기준으로 설명할게요.",
      quickPrompts: ["왜 이 방향인가요?", "무효화 기준을 설명해줘", "리스크만 요약해줘"],
      error: "AI 응답을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      composing: "작성 중...",
      placeholder: "현재 셋업에 대해 질문",
      send: "전송"
    }
  },
  en: {
    appName: "Trading Helper",
    tagline: "U.S. stock scalping analysis dashboard",
    disclaimer:
      "Analysis only. No order execution. Free public data can be delayed or incomplete. Investment decisions and losses are the user’s responsibility; developers are not liable for trading losses.",
    nav: {
      dashboard: "Dashboard",
      learn: "Learn"
    },
    language: {
      label: "Language",
      ko: "한국어",
      en: "English"
    },
    aria: {
      symbolSearch: "Symbol search",
      refresh: "Refresh",
      timeframe: "Timeframe",
      indicators: "Indicator display"
    },
    errors: {
      candles: "Could not load candle data.",
      market: "Could not load market data.",
      loading: "Refreshing data...",
      realtime: "Could not load the realtime stream.",
      realtimeKey: "Second-level candles require POLYGON_API_KEY.",
      realtimeWaiting: "Waiting for realtime trades..."
    },
    chart: {
      noData: "No chart data is available.",
      ariaLabel: "Candlestick chart",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      resetZoom: "Reset chart"
    },
    chartControls: {
      candleStyle: "Candles",
      regular: "Regular",
      heikinAshi: "Heikin-Ashi",
      overlays: "Trade plan"
    },
    signal: {
      loading: "Signal loading",
      title: "Signal",
      bias: {
        LONG: "Long bias",
        SHORT: "Short bias",
        NEUTRAL: "Neutral"
      } satisfies Record<SignalBias, string>,
      entry: "Entry watch",
      wait: "Wait",
      invalidation: "Invalidation",
      target: "Targets",
      data: "Data"
    },
    scanner: {
      title: "Favorites Scanner",
      add: "Add favorite",
      remove: "Remove favorite",
      empty: "Add favorites, then scan them manually here.",
      scan: "Scan favorites",
      scanning: "Scanning...",
      score: "Score",
      stop: "Stop",
      entry: "Entry",
      age: "Data",
      minutes: "m ago",
      patterns: "Patterns",
      chartPatterns: "Chart",
      error: "Scan failed"
    },
    risk: {
      loading: "Risk loading",
      title: "Indicator Snapshot"
    },
    ai: {
      title: "Fintech Analysis Chat",
      providerAria: "AI provider",
      openAiNoKey: "OpenAI key missing",
      geminiNoKey: "Gemini key missing",
      initial: "Load a symbol and I will explain the current signal and indicators.",
      quickPrompts: ["Why this direction?", "Explain invalidation", "Summarize risk only"],
      error: "Could not load the AI response. Please try again.",
      composing: "Writing...",
      placeholder: "Ask about the current setup",
      send: "Send"
    }
  }
} satisfies Record<AppLocale, Record<string, unknown>>;

export type UiMessages = (typeof messages)[AppLocale];
