"use client";

import { BookOpen, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppLocale } from "@trading-helper/core";

const indicatorCards = [
  {
    key: "EMA",
    ko: "최근 가격에 더 큰 가중치를 둔 이동평균입니다. 단기 추세와 지지/저항 후보를 빠르게 볼 때 씁니다.",
    en: "A moving average that weights recent prices more heavily. Useful for reading short-term trend and dynamic support/resistance."
  },
  {
    key: "VWAP",
    ko: "거래량을 반영한 평균 가격입니다. 장중 가격이 평균 매수/매도 비용 위인지 아래인지 확인합니다.",
    en: "A volume-weighted average price. It helps show whether price is trading above or below the session’s average traded cost."
  },
  {
    key: "RSI",
    ko: "상승/하락 강도를 0~100으로 보는 모멘텀 지표입니다. 과열, 과매도, 추격 리스크를 확인합니다.",
    en: "A 0-100 momentum oscillator. It helps identify overextension, oversold conditions, and chasing risk."
  },
  {
    key: "MACD",
    ko: "두 EMA의 차이로 모멘텀 변화를 봅니다. 히스토그램은 모멘텀 개선/약화를 빠르게 보여줍니다.",
    en: "Tracks momentum changes through the difference between two EMAs. The histogram shows improvement or weakening."
  },
  {
    key: "Bollinger Bands",
    ko: "이동평균 주변 변동성 밴드입니다. 가격이 밴드 바깥으로 치우칠 때 확장/되돌림 리스크를 봅니다.",
    en: "Volatility bands around a moving average. They help spot expansion, mean reversion, and stretched price action."
  },
  {
    key: "ATR",
    ko: "평균 변동폭입니다. 스탑로스 폭, 목표가, 포지션 리스크를 잡을 때 참고합니다.",
    en: "Average true range. Useful for stop distance, target planning, and position risk context."
  },
  {
    key: "Relative Volume",
    ko: "현재 거래량이 최근 평균 대비 얼마나 큰지 봅니다. 신호의 힘과 관심 증가 여부를 확인합니다.",
    en: "Compares current volume against recent average volume. It helps judge participation behind a move."
  },
  {
    key: "OBV",
    ko: "상승일 거래량은 더하고 하락일 거래량은 빼는 누적 지표입니다. 가격과 거래량 방향 차이를 봅니다.",
    en: "A cumulative volume indicator that adds volume on up candles and subtracts it on down candles."
  },
  {
    key: "Support / Resistance",
    ko: "최근 가격이 반응한 지지/저항 구간입니다. 진입, 익절, 무효화 판단에 중요합니다.",
    en: "Recent reaction levels where price found support or resistance. Important for entries, targets, and invalidation."
  },
  {
    key: "Pivot",
    ko: "최근 고가/저가/종가를 기준으로 보는 중심 가격입니다. 가격이 피벗 위에서 버티는지, 아래로 밀리는지로 장중 힘의 균형을 참고합니다.",
    en: "A central reference price from recent high, low, and close. It helps judge whether intraday pressure is holding above or below balance."
  },
  {
    key: "Volume",
    ko: "가격 움직임에 실제 참여가 붙는지 보는 기본 자료입니다. 돌파가 거래량 없이 나오면 속임수일 수 있고, 거래량 급증은 추격 리스크도 함께 키웁니다.",
    en: "The base participation measure behind price movement. Breakouts without volume can be weak, while volume spikes can also increase chasing risk."
  },
  {
    key: "Heikin-Ashi",
    ko: "가격을 평균화한 캔들입니다. 노이즈를 줄여 추세를 보기 쉽지만 실제 체결 가격은 일반 캔들을 봐야 합니다.",
    en: "Averaged candles that smooth noise and clarify trend. Use regular candles for actual price levels."
  },
  {
    key: "Regular Candles",
    ko: "실제 시가/고가/저가/종가를 그대로 보여주는 기본 캔들입니다. 타점, 손절, 목표가는 일반 캔들의 실제 가격을 기준으로 봐야 합니다.",
    en: "The raw open, high, low, and close candles. Entries, stops, and targets should be checked against regular candle prices."
  },
  {
    key: "Trade Plan Overlay",
    ko: "차트 위에 진입 관찰 구간, 무효화/스탑, 1R/2R 목표선을 표시합니다. 신호가 아니라 계획이 어느 가격에서 깨지는지 보는 도구입니다.",
    en: "Chart lines for entry watch, invalidation/stop, and 1R/2R targets. It visualizes where the idea works or fails."
  },
  {
    key: "Stop Loss",
    ko: "아이디어가 틀렸다고 보는 가격입니다. 손실을 제한하기 위해 진입 전에 정해야 합니다.",
    en: "The price where the trade idea is considered invalid. It should be defined before entry to limit losses."
  },
  {
    key: "Risk / Reward",
    ko: "감수하는 위험 대비 기대 보상입니다. 예: 2R은 위험 1만큼을 걸어 보상 2를 기대한다는 뜻입니다.",
    en: "Expected reward relative to risk. For example, 2R means targeting twice the amount being risked."
  },
  {
    key: "Data Staleness",
    ko: "무료 공개 데이터는 지연되거나 누락될 수 있습니다. 단타에서는 데이터 시간이 오래될수록 신호 신뢰도를 낮춰 봐야 합니다.",
    en: "Free public data can be delayed or incomplete. For short-term trading, older data should lower confidence."
  }
] as const;

const candlestickPatternCards = [
  {
    key: "bullish_engulfing",
    title: { ko: "상승 장악형", en: "Bullish Engulfing" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    ko: "작은 음봉 뒤에 강한 양봉이 이전 몸통을 감싸면 매수 반전 후보로 봅니다. 저점권이나 지지 부근에서 더 의미가 커집니다.",
    en: "A strong bullish body engulfs the prior bearish body. It is more meaningful near support or after a downside move."
  },
  {
    key: "hammer",
    title: { ko: "망치형", en: "Hammer" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    ko: "긴 아래꼬리와 작은 몸통이 보이면 아래 가격을 밀어낸 흔적으로 봅니다. 하락 뒤 지지 확인과 거래량이 함께 필요합니다.",
    en: "A long lower wick and small body suggest downside rejection. It needs support context and participation confirmation."
  },
  {
    key: "morning_star",
    title: { ko: "샛별형", en: "Morning Star" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    ko: "하락 캔들, 작은 망설임 캔들, 강한 회복 양봉이 이어지는 3봉 반전 후보입니다. 세 번째 캔들의 회복 강도가 중요합니다.",
    en: "A three-candle bullish reversal candidate: selloff, indecision, then strong recovery. The third candle's recovery matters."
  },
  {
    key: "three_white_soldiers",
    title: { ko: "적삼병", en: "Three White Soldiers" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    ko: "연속된 세 개의 강한 양봉입니다. 매수 참여가 이어진다는 뜻이지만 이미 많이 뻗은 자리라면 추격 리스크도 봐야 합니다.",
    en: "Three consecutive bullish candles show sustained buying pressure, but a stretched move can carry chasing risk."
  },
  {
    key: "bearish_engulfing",
    title: { ko: "하락 장악형", en: "Bearish Engulfing" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    ko: "작은 양봉 뒤에 강한 음봉이 이전 몸통을 감싸면 매도 반전 후보로 봅니다. 고점권이나 저항 부근에서 더 조심합니다.",
    en: "A strong bearish body engulfs the prior bullish body. It is more important near resistance or after an extended advance."
  },
  {
    key: "shooting_star",
    title: { ko: "유성형", en: "Shooting Star" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    ko: "긴 위꼬리와 작은 몸통이 보이면 위 가격을 받아주지 못한 흔적으로 봅니다. 저항과 다음 캔들의 약세 확인이 중요합니다.",
    en: "A long upper wick and small body suggest upside rejection. Resistance context and the next candle's weakness matter."
  },
  {
    key: "evening_star",
    title: { ko: "석별형", en: "Evening Star" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    ko: "상승 캔들, 작은 망설임 캔들, 강한 하락 음봉이 이어지는 3봉 반전 후보입니다. 고점권에서 더 의미가 큽니다.",
    en: "A three-candle bearish reversal candidate: advance, indecision, then strong drop. It matters more near highs."
  },
  {
    key: "three_black_crows",
    title: { ko: "흑삼병", en: "Three Black Crows" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    ko: "연속된 세 개의 강한 음봉입니다. 매도 압력이 이어진다는 뜻이지만 과매도 자리에서는 늦은 숏 추격을 경계합니다.",
    en: "Three consecutive bearish candles show sustained selling pressure, but late shorts can be risky after an oversold move."
  }
] as const;

const chartPatternCards = [
  {
    key: "head_shoulders",
    title: { ko: "헤드앤숄더", en: "Head and Shoulders" },
    ko: "왼쪽 어깨, 더 높은 머리, 오른쪽 어깨가 보이는 반전 구조입니다. 목선 이탈 전까지는 후보로 보고, 이탈 후에는 손절 기준을 명확히 둬야 합니다.",
    en: "A reversal structure with a left shoulder, higher head, and right shoulder. Treat it as a candidate until neckline loss confirms weakness."
  },
  {
    key: "inverse_head_shoulders",
    title: { ko: "역헤드앤숄더", en: "Inverse Head and Shoulders" },
    ko: "왼쪽 어깨, 더 낮은 머리, 오른쪽 어깨가 보이는 상승 반전 구조입니다. 목선 돌파와 거래량 확인이 중요합니다.",
    en: "A bullish reversal structure with a left shoulder, lower head, and right shoulder. Neckline reclaim and volume confirmation matter."
  },
  {
    key: "bull_flag",
    title: { ko: "불 플래그", en: "Bull Flag" },
    ko: "강한 상승 뒤 짧은 눌림이나 횡보가 생기는 상승 지속형 패턴입니다. 플래그 상단 돌파 여부가 핵심입니다.",
    en: "A bullish continuation setup after a strong upside impulse. The key trigger is whether price breaks the flag high."
  },
  {
    key: "bear_flag",
    title: { ko: "베어 플래그", en: "Bear Flag" },
    ko: "강한 하락 뒤 짧은 반등이나 횡보가 생기는 하락 지속형 패턴입니다. 플래그 하단 이탈 여부가 핵심입니다.",
    en: "A bearish continuation setup after a strong downside impulse. The key trigger is whether price breaks the flag low."
  },
  {
    key: "bullish_pennant",
    title: { ko: "상승 페넌트", en: "Bullish Pennant" },
    ko: "강한 상승 뒤 변동폭이 좁아지며 작은 삼각형처럼 수렴하는 상승 지속 후보입니다.",
    en: "A bullish continuation candidate where price contracts into a small triangle after a strong upside impulse."
  },
  {
    key: "bearish_pennant",
    title: { ko: "하락 페넌트", en: "Bearish Pennant" },
    ko: "강한 하락 뒤 변동폭이 좁아지며 작은 삼각형처럼 수렴하는 하락 지속 후보입니다.",
    en: "A bearish continuation candidate where price contracts into a small triangle after a strong downside impulse."
  },
  {
    key: "ascending_triangle",
    title: { ko: "상승 삼각수렴", en: "Ascending Triangle" },
    ko: "비슷한 저항선 아래에서 저점이 계속 높아지는 구조입니다. 저항 돌파와 거래량 확인이 중요합니다.",
    en: "A setup with flat resistance and rising lows. Resistance breakout and participation are the important checks."
  },
  {
    key: "descending_triangle",
    title: { ko: "하락 삼각수렴", en: "Descending Triangle" },
    ko: "비슷한 지지선 위에서 고점이 계속 낮아지는 구조입니다. 지지 이탈 여부가 중요합니다.",
    en: "A setup with flat support and falling highs. Support breakdown is the important confirmation."
  },
  {
    key: "symmetrical_triangle",
    title: { ko: "대칭 삼각수렴", en: "Symmetrical Triangle" },
    ko: "고점은 낮아지고 저점은 높아지는 압축 구조입니다. 방향 예측보다 돌파 방향과 거래량 확인이 더 중요합니다.",
    en: "A compression pattern with lower highs and higher lows. Breakout direction and participation matter more than prediction."
  },
  {
    key: "rising_wedge",
    title: { ko: "상승 쐐기", en: "Rising Wedge" },
    ko: "고점과 저점이 모두 높아지지만 폭이 좁아지는 구조입니다. 하방 이탈 리스크를 봅니다.",
    en: "Both highs and lows rise while the range narrows. Traders watch for downside failure."
  },
  {
    key: "falling_wedge",
    title: { ko: "하락 쐐기", en: "Falling Wedge" },
    ko: "고점과 저점이 모두 낮아지지만 폭이 좁아지는 구조입니다. 상방 돌파 후보를 봅니다.",
    en: "Both highs and lows fall while the range narrows. Traders watch for upside reversal."
  },
  {
    key: "double_top",
    title: { ko: "쌍봉", en: "Double Top" },
    ko: "비슷한 가격에서 두 번 막힌 구조입니다. 중간 저점 이탈이 전환 확인 신호가 됩니다.",
    en: "Two failures near the same price. The middle trough is the confirmation level."
  },
  {
    key: "double_bottom",
    title: { ko: "쌍바닥", en: "Double Bottom" },
    ko: "비슷한 가격에서 두 번 방어된 구조입니다. 중간 고점 돌파가 전환 확인 신호가 됩니다.",
    en: "Two defenses near the same price. The middle peak is the confirmation level."
  }
] as const;

const flowResourceCards = [
  {
    key: "pressure-proxy",
    title: { ko: "장중 매수세 프록시", en: "Intraday Demand Proxies" },
    ko: "무료 데이터만으로 기관 주문을 직접 볼 수는 없습니다. 대신 상대거래량, VWAP 위/아래, OBV 방향, 종가 위치, 돌파 거래량을 묶어 참여 강도를 추정합니다.",
    en: "Free data cannot directly identify institutional orders. Use relative volume, VWAP position, OBV direction, close location, and breakout volume as participation proxies.",
    href: "https://www.investor.gov/introduction-investing/investing-basics/glossary/short-sale-volume-and-transaction-data"
  },
  {
    key: "finra-short-volume",
    title: { ko: "FINRA 일별 공매도 거래량", en: "FINRA Daily Short Sale Volume" },
    ko: "당일 정규장 중 TRF/ADF/ORF에 보고된 공매도 거래량 집계입니다. 보통 당일 18:00 ET까지 게시되며, 이것은 공매도잔량이 아니라 거래량 데이터입니다.",
    en: "Aggregated short-sale volume reported to TRF/ADF/ORF during regular hours. It is generally posted by 6:00 p.m. ET and is volume, not short interest.",
    href: "https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data/daily-short-sale-volume-files"
  },
  {
    key: "nasdaq-short-interest",
    title: { ko: "Nasdaq 공매도잔량", en: "Nasdaq Short Interest" },
    ko: "공매도잔량은 특정 결제일 기준 포지션 데이터라 단타용 실시간 지표가 아닙니다. 반월 단위로 공개·배포되며 숏 스퀴즈 리스크를 보는 보조 자료입니다.",
    en: "Short interest is position data for settlement dates, not a real-time scalping feed. It is a delayed context input for squeeze and crowding risk.",
    href: "https://www.nasdaq.com/solutions/data/equities/short-interest"
  },
  {
    key: "sec-13f",
    title: { ko: "SEC 13F 기관 보유", en: "SEC 13F Institutional Holdings" },
    ko: "대형 운용사의 보유 종목을 분기 단위로 보는 자료입니다. 단타 타점보다는 중장기 기관 관심과 보유 변화 확인에 적합합니다.",
    en: "Quarterly holdings from large investment managers. Useful for institutional interest context, not intraday entries.",
    href: "https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets"
  },
  {
    key: "sec-ftd",
    title: { ko: "SEC Fails-to-Deliver", en: "SEC Fails-to-Deliver" },
    ko: "결제 실패 잔량을 월 2회 공개합니다. 숏과 관련될 수 있지만 반드시 공매도나 불법 공매도의 증거는 아니므로 과해석하면 안 됩니다.",
    en: "Twice-monthly settlement fail balances. They can be related to shorts, but are not proof of short selling or abusive naked shorting.",
    href: "https://www.sec.gov/data-research/sec-markets-data/fails-deliver-data"
  }
] as const;

type ChartPatternKey = (typeof chartPatternCards)[number]["key"];
type CandlestickPatternKey = (typeof candlestickPatternCards)[number]["key"];

export default function LearnPage() {
  const [locale, setLocale] = useState<AppLocale>("ko");

  useEffect(() => {
    const saved = window.localStorage.getItem("trading-helper-locale");
    if (saved === "ko" || saved === "en") {
      window.setTimeout(() => setLocale(saved), 0);
    }
  }, []);

  const isEnglish = locale === "en";

  function changeLocale(nextLocale: AppLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem("trading-helper-locale", nextLocale);
  }

  return (
    <main className="learn-shell">
      <header className="learn-hero">
        <div>
          <p className="eyebrow">{isEnglish ? "Newbie Friendly" : "초보자 친화"}</p>
          <h1>{isEnglish ? "Indicator & Chart Pattern Guide" : "지표/차트 형태 가이드"}</h1>
          <p>
            {isEnglish
              ? "A practical glossary for reading indicators, chart structures, and risk context without pretending patterns are magic."
              : "Trading Helper 대시보드를 읽기 위한 실전형 용어집입니다. 지표와 차트 형태는 마법이 아니라 맥락을 보는 도구입니다."}
          </p>
        </div>
        <div className="top-actions">
          <button className="small-action" type="button" onClick={() => changeLocale(isEnglish ? "ko" : "en")}>
            {isEnglish ? "한국어" : "English"}
          </button>
          <Link className="learn-link" href="/">
            <Home size={17} aria-hidden />
            {isEnglish ? "Dashboard" : "대시보드"}
          </Link>
        </div>
      </header>
      <section className="learn-section-title">
        <p className="eyebrow">{isEnglish ? "Indicators" : "보조지표"}</p>
        <h2>{isEnglish ? "Dashboard Signals" : "대시보드 신호"}</h2>
      </section>
      <section className="learn-grid">
        {indicatorCards.map((card) => (
          <article key={card.key} className="learn-card">
            <BookOpen size={20} aria-hidden />
            <h2>{card.key}</h2>
            <p>{isEnglish ? card.en : card.ko}</p>
          </article>
        ))}
      </section>
      <section className="learn-section-title">
        <p className="eyebrow">{isEnglish ? "Candlestick Patterns" : "캔들 패턴"}</p>
        <h2>{isEnglish ? "Signal Card Candle Shapes" : "Signal 카드에 뜨는 캔들 모양"}</h2>
      </section>
      <section className="learn-grid">
        {candlestickPatternCards.map((card) => (
          <article key={card.key} className="learn-card pattern-card">
            <CandlestickPatternDiagram patternKey={card.key} title={card.title[locale]} />
            <h2>{card.title[locale]}</h2>
            <span className={card.direction.en === "Long watch" ? "learn-direction long" : "learn-direction short"}>
              {card.direction[locale]}
            </span>
            <p>{isEnglish ? card.en : card.ko}</p>
          </article>
        ))}
      </section>
      <section className="learn-section-title">
        <p className="eyebrow">{isEnglish ? "Chart Patterns" : "차트 형태"}</p>
        <h2>{isEnglish ? "Market Structure Setups" : "시장 구조 셋업"}</h2>
      </section>
      <section className="learn-grid">
        {chartPatternCards.map((card) => (
          <article key={card.key} className="learn-card pattern-card">
            <PatternDiagram patternKey={card.key} title={card.title[locale]} />
            <h2>{card.title[locale]}</h2>
            <p>{isEnglish ? card.en : card.ko}</p>
          </article>
        ))}
      </section>
      <section className="learn-section-title">
        <p className="eyebrow">{isEnglish ? "Flow Data" : "수급/공매도 자료"}</p>
        <h2>{isEnglish ? "What Can Help With Chase Risk" : "추격매수 전에 같이 볼 자료"}</h2>
      </section>
      <section className="learn-grid">
        {flowResourceCards.map((card) => (
          <article key={card.key} className="learn-card">
            <BookOpen size={20} aria-hidden />
            <h2>{card.title[locale]}</h2>
            <p>{isEnglish ? card.en : card.ko}</p>
            <a className="source-link" href={card.href} target="_blank" rel="noreferrer">
              {isEnglish ? "Official source" : "공식 자료"}
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}

function CandlestickPatternDiagram({ patternKey, title }: { patternKey: CandlestickPatternKey; title: string }) {
  const candles = candlestickShapes(patternKey);

  return (
    <svg className="pattern-diagram candle-diagram" viewBox="0 0 220 118" role="img" aria-label={title}>
      <rect x="1" y="1" width="218" height="116" rx="8" />
      <line className="baseline" x1="18" y1="92" x2="202" y2="92" />
      {candles.map((candle) => {
        const bodyY = Math.min(candle.open, candle.close);
        const bodyHeight = Math.max(Math.abs(candle.open - candle.close), 6);

        return (
          <g className={`candle ${candle.kind}`} key={`${patternKey}-${candle.x}`}>
            <line x1={candle.x} y1={candle.high} x2={candle.x} y2={candle.low} />
            <rect x={candle.x - 10} y={bodyY} width="20" height={bodyHeight} rx="3" />
          </g>
        );
      })}
    </svg>
  );
}

function candlestickShapes(
  patternKey: CandlestickPatternKey
): Array<{ x: number; open: number; close: number; high: number; low: number; kind: "bullish" | "bearish" | "neutral" }> {
  const shapes: Record<
    CandlestickPatternKey,
    Array<{ x: number; open: number; close: number; high: number; low: number; kind: "bullish" | "bearish" | "neutral" }>
  > = {
    bullish_engulfing: [
      { x: 82, open: 48, close: 72, high: 42, low: 78, kind: "bearish" },
      { x: 126, open: 82, close: 34, high: 28, low: 88, kind: "bullish" }
    ],
    hammer: [
      { x: 70, open: 42, close: 66, high: 36, low: 72, kind: "bearish" },
      { x: 110, open: 58, close: 70, high: 52, low: 76, kind: "bearish" },
      { x: 150, open: 72, close: 60, high: 54, low: 102, kind: "bullish" }
    ],
    morning_star: [
      { x: 66, open: 36, close: 76, high: 30, low: 82, kind: "bearish" },
      { x: 110, open: 78, close: 72, high: 66, low: 88, kind: "neutral" },
      { x: 154, open: 70, close: 34, high: 30, low: 76, kind: "bullish" }
    ],
    three_white_soldiers: [
      { x: 68, open: 78, close: 56, high: 50, low: 84, kind: "bullish" },
      { x: 110, open: 62, close: 40, high: 34, low: 68, kind: "bullish" },
      { x: 152, open: 46, close: 24, high: 18, low: 52, kind: "bullish" }
    ],
    bearish_engulfing: [
      { x: 82, open: 70, close: 46, high: 40, low: 76, kind: "bullish" },
      { x: 126, open: 36, close: 84, high: 30, low: 90, kind: "bearish" }
    ],
    shooting_star: [
      { x: 70, open: 76, close: 52, high: 46, low: 82, kind: "bullish" },
      { x: 110, open: 56, close: 42, high: 36, low: 64, kind: "bullish" },
      { x: 150, open: 48, close: 58, high: 14, low: 66, kind: "bearish" }
    ],
    evening_star: [
      { x: 66, open: 76, close: 36, high: 30, low: 82, kind: "bullish" },
      { x: 110, open: 36, close: 42, high: 28, low: 52, kind: "neutral" },
      { x: 154, open: 44, close: 82, high: 38, low: 88, kind: "bearish" }
    ],
    three_black_crows: [
      { x: 68, open: 30, close: 52, high: 24, low: 58, kind: "bearish" },
      { x: 110, open: 46, close: 68, high: 40, low: 74, kind: "bearish" },
      { x: 152, open: 62, close: 86, high: 56, low: 92, kind: "bearish" }
    ]
  };

  return shapes[patternKey];
}

function PatternDiagram({ patternKey, title }: { patternKey: ChartPatternKey; title: string }) {
  const path = patternPath(patternKey);
  const guides = patternGuides(patternKey);

  return (
    <svg className="pattern-diagram" viewBox="0 0 220 118" role="img" aria-label={title}>
      <rect x="1" y="1" width="218" height="116" rx="8" />
      {guides.map((guide) => (
        <line key={guide} x1={guide.split(" ")[0]} y1={guide.split(" ")[1]} x2={guide.split(" ")[2]} y2={guide.split(" ")[3]} />
      ))}
      <polyline points={path} />
    </svg>
  );
}

function patternPath(patternKey: ChartPatternKey): string {
  const paths: Record<ChartPatternKey, string> = {
    head_shoulders: "15,88 42,58 68,84 103,24 138,84 166,59 205,91",
    inverse_head_shoulders: "15,30 42,60 68,36 103,96 138,36 166,61 205,27",
    bull_flag: "18,94 54,34 86,25 99,44 125,37 137,56 164,49 178,68 205,38",
    bear_flag: "18,24 54,84 86,93 100,74 126,81 140,62 166,69 180,50 205,81",
    bullish_pennant: "18,94 56,32 88,28 116,46 144,37 116,46 144,55 176,48 204,30",
    bearish_pennant: "18,24 56,86 88,90 116,72 144,81 116,72 144,63 176,70 204,88",
    ascending_triangle: "16,90 52,72 88,84 126,58 164,66 204,35",
    descending_triangle: "16,28 52,47 88,35 126,60 164,51 204,82",
    symmetrical_triangle: "16,88 52,36 86,78 122,49 158,68 204,54",
    rising_wedge: "16,92 52,58 88,78 124,45 160,62 204,40",
    falling_wedge: "16,28 52,62 88,45 124,78 160,61 204,82",
    double_top: "16,88 48,45 82,83 116,45 152,85 204,96",
    double_bottom: "16,30 48,75 82,38 116,75 152,35 204,24"
  };

  return paths[patternKey];
}

function patternGuides(patternKey: ChartPatternKey): string[] {
  const guides: Partial<Record<ChartPatternKey, string[]>> = {
    head_shoulders: ["34 84 176 84"],
    inverse_head_shoulders: ["34 36 176 36"],
    bull_flag: ["89 39 178 63", "86 24 175 49"],
    bear_flag: ["89 79 178 55", "86 94 175 69"],
    bullish_pennant: ["88 28 176 48", "88 66 176 48"],
    bearish_pennant: ["88 90 176 70", "88 52 176 70"],
    ascending_triangle: ["32 34 204 34", "36 91 204 39"],
    descending_triangle: ["32 82 204 82", "36 28 204 78"],
    symmetrical_triangle: ["35 34 204 55", "35 90 204 55"],
    rising_wedge: ["36 58 204 40", "36 96 204 62"],
    falling_wedge: ["36 62 204 82", "36 26 204 60"],
    double_top: ["40 45 126 45", "82 83 152 83"],
    double_bottom: ["40 75 126 75", "82 38 152 38"]
  };

  return guides[patternKey] ?? [];
}
