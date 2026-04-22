"use client";

import { BookOpen, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppLocale } from "@trading-helper/core";

const cards = [
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
          <h1>{isEnglish ? "Indicator Guide" : "보조지표 가이드"}</h1>
          <p>
            {isEnglish
              ? "A practical glossary for reading the Trading Helper dashboard without pretending indicators are magic."
              : "Trading Helper 대시보드를 읽기 위한 실전형 용어집입니다. 지표는 마법이 아니라 맥락을 보는 도구입니다."}
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
      <section className="learn-grid">
        {cards.map((card) => (
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
