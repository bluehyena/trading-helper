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
    key: "Heikin-Ashi",
    ko: "가격을 평균화한 캔들입니다. 노이즈를 줄여 추세를 보기 쉽지만 실제 체결 가격은 일반 캔들을 봐야 합니다.",
    en: "Averaged candles that smooth noise and clarify trend. Use regular candles for actual price levels."
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

type ChartPatternKey = (typeof chartPatternCards)[number]["key"];

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
    </main>
  );
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
