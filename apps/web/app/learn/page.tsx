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
];

const chartPatternCards = [
  {
    key: "Head and Shoulders",
    ko: "왼쪽 어깨, 더 높은 머리, 오른쪽 어깨가 보이는 반전 구조입니다. 목선 이탈 전까지는 후보로 보고, 이탈 후에는 손절 기준을 명확히 둬야 합니다.",
    en: "A reversal structure with a left shoulder, higher head, and right shoulder. Treat it as a candidate until neckline loss confirms weakness."
  },
  {
    key: "Inverse Head and Shoulders",
    ko: "왼쪽 어깨, 더 낮은 머리, 오른쪽 어깨가 보이는 상승 반전 구조입니다. 목선 돌파와 거래량 확인이 중요합니다.",
    en: "A bullish reversal structure with a left shoulder, lower head, and right shoulder. Neckline reclaim and volume confirmation matter."
  },
  {
    key: "Bull / Bear Flag",
    ko: "강한 한 방향 움직임 뒤 짧은 눌림이나 반등이 생기는 지속형 패턴입니다. 플래그 상단/하단 돌파 여부가 핵심입니다.",
    en: "A continuation setup after a strong impulse. The important trigger is whether price breaks the flag high or low."
  },
  {
    key: "Pennant",
    ko: "강한 움직임 뒤 변동폭이 작아지며 수렴하는 형태입니다. 단타에서는 수렴 돌파 방향과 실패 시 빠른 무효화가 중요합니다.",
    en: "A contracting consolidation after a strong move. Short-term traders watch breakout direction and invalidate quickly if it fails."
  },
  {
    key: "Ascending / Descending Triangle",
    ko: "상승 삼각수렴은 평평한 저항과 높아지는 저점, 하락 삼각수렴은 평평한 지지와 낮아지는 고점이 특징입니다.",
    en: "Ascending triangles show flat resistance and rising lows; descending triangles show flat support and falling highs."
  },
  {
    key: "Symmetrical Triangle",
    ko: "고점은 낮아지고 저점은 높아지는 압축 구조입니다. 방향 예측보다 돌파 방향과 거래량 확인이 더 중요합니다.",
    en: "A compression pattern with lower highs and higher lows. Breakout direction and participation matter more than prediction."
  },
  {
    key: "Rising / Falling Wedge",
    ko: "가격은 한 방향으로 움직이지만 폭이 좁아지는 구조입니다. 상승 쐐기는 하방 실패, 하락 쐐기는 상방 반전을 조심해서 봅니다.",
    en: "A narrowing structure while price drifts in one direction. Rising wedges warn of downside failure; falling wedges can hint at upside reversal."
  },
  {
    key: "Double Top / Bottom",
    ko: "비슷한 가격에서 두 번 막히거나 방어되는 구조입니다. 중간 저점/고점 돌파가 확인 전환 신호가 됩니다.",
    en: "Two failures or defenses near the same price. The middle trough or peak is the confirmation level."
  }
];

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
          <article key={card.key} className="learn-card">
            <BookOpen size={20} aria-hidden />
            <h2>{card.key}</h2>
            <p>{isEnglish ? card.en : card.ko}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
