"use client";

import type { AppLocale } from "@trading-helper/core";
import { BookOpen, CandlestickChart, Home, Layers3, Shield, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SectionId = "indicators" | "patterns" | "products" | "flow";
type ChartPatternKey =
  | "head_and_shoulders"
  | "inverse_head_and_shoulders"
  | "bull_flag"
  | "bear_flag"
  | "bullish_pennant"
  | "bearish_pennant"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "rising_wedge"
  | "falling_wedge"
  | "double_top"
  | "double_bottom";
type CandlestickPatternKey =
  | "bullish_engulfing"
  | "hammer"
  | "morning_star"
  | "three_white_soldiers"
  | "bearish_engulfing"
  | "shooting_star"
  | "evening_star"
  | "three_black_crows";
type PayoffDiagramKey = "long_call" | "long_put" | "covered_call" | "protective_put" | "cash_secured_put";

const indicatorCards = [
  {
    key: "EMA / SMA",
    body: {
      ko: "이동평균선은 가격 흐름을 부드럽게 읽기 위한 기본 도구입니다. EMA는 최근 가격에 더 민감하고, SMA는 더 천천히 반응합니다. 단타는 EMA 9/21, 스윙은 50/200 구간을 많이 봅니다.",
      en: "Moving averages smooth price so trend can be read more clearly. EMA reacts faster to recent price, while SMA is slower. Intraday traders often watch EMA 9/21 and swing traders often care about 50/200."
    }
  },
  {
    key: "VWAP",
    body: {
      ko: "세션 동안 거래량이 실린 평균 가격입니다. 가격이 VWAP 위에 있으면 당일 평균 체결가보다 강한 편으로, 아래에 있으면 공급 우위로 해석하는 경우가 많습니다.",
      en: "VWAP is the volume-weighted average price of the session. Trading above it often suggests intraday demand, while trading below it often suggests supply."
    }
  },
  {
    key: "RSI 14",
    body: {
      ko: "0~100 사이 모멘텀 지표입니다. 50 위는 상대적으로 강한 편, 50 아래는 약한 편으로 보되, 70 이상과 30 이하는 과열과 과매도 위험까지 함께 봐야 합니다.",
      en: "RSI is a 0-100 momentum gauge. Above 50 usually means strength and below 50 weakness, but values above 70 or below 30 can also signal overextension."
    }
  },
  {
    key: "MACD",
    body: {
      ko: "두 이동평균의 차이로 모멘텀 변화를 봅니다. 히스토그램이 플러스로 커지면 상방 가속, 마이너스로 깊어지면 하방 가속을 읽는 데 도움됩니다.",
      en: "MACD tracks momentum change using the gap between moving averages. A rising positive histogram can suggest upside acceleration; a deepening negative histogram can suggest downside pressure."
    }
  },
  {
    key: "Bollinger Bands",
    body: {
      ko: "평균 가격 주변의 변동성 밴드입니다. 밴드 확장은 변동성 증가, 밴드 축소는 압축을 의미할 수 있습니다. 돌파 직전의 긴장감이나 과도한 이격을 확인할 때 유용합니다.",
      en: "These are volatility bands around a mean price. Expansion can signal rising volatility and contraction can signal compression before a move."
    }
  },
  {
    key: "ATR 14",
    body: {
      ko: "평균 변동폭입니다. 손절 거리를 너무 촘촘하게 둘지, 목표가를 얼마나 멀리 잡을지 판단하는 데 많이 씁니다.",
      en: "ATR measures average range. It is useful for sizing stop distance and checking whether targets are realistic for the current volatility regime."
    }
  },
  {
    key: "Relative Volume",
    body: {
      ko: "현재 거래량이 최근 평균 대비 얼마나 강한지 보여줍니다. 신호가 좋아 보여도 거래량이 따라오지 않으면 힘이 약할 수 있습니다.",
      en: "Relative volume compares current participation to recent average participation. A clean setup with weak volume can still fail."
    }
  },
  {
    key: "OBV",
    body: {
      ko: "상승 캔들 거래량은 더하고 하락 캔들 거래량은 빼는 누적 흐름 지표입니다. 가격과 거래량의 방향이 같이 가는지, 엇갈리는지 볼 때 좋습니다.",
      en: "OBV accumulates volume with up candles and subtracts it on down candles. It helps compare price direction with participation."
    }
  },
  {
    key: "Support / Resistance",
    body: {
      ko: "가격이 자주 반응했던 구간입니다. 단타든 스윙이든 진입, 손절, 목표가는 결국 이 구간들과의 관계를 어떻게 보느냐에 달려 있습니다.",
      en: "These are reaction levels where price repeatedly responded. Entries, stops, and targets are usually framed around them."
    }
  },
  {
    key: "Volume",
    body: {
      ko: "가장 기본적인 참여도 지표입니다. 거래량 없는 돌파는 허탈해지기 쉽고, 거래량 급증은 추격 리스크도 함께 커질 수 있습니다.",
      en: "Volume is the base participation measure. Breakouts without it can fail, while large spikes can also mean late-chase risk."
    }
  },
  {
    key: "Heikin-Ashi",
    body: {
      ko: "노이즈를 줄여 추세를 보기 쉬운 캔들 방식입니다. 다만 실제 진입과 손절 가격은 일반 캔들 가격으로 다시 확인해야 합니다.",
      en: "Heikin-Ashi smooths noise and clarifies trend, but actual entries and stops should still be checked against regular candle prices."
    }
  },
  {
    key: "Trade Plan Overlay",
    body: {
      ko: "트레이딩 헬퍼는 진입 관찰 구간, 무효화 가격, 1R/2R 목표를 차트 위에 함께 표시합니다. 신호를 숫자 대신 위치로 이해하게 해주는 도구입니다.",
      en: "Trading Helper overlays entry watch zones, invalidation, and 1R/2R targets on the chart so the plan can be read spatially instead of only as text."
    }
  }
] as const;

const candlestickPatterns = [
  {
    key: "bullish_engulfing",
    title: { ko: "상승 장악형", en: "Bullish Engulfing" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    body: {
      ko: "이전 음봉 몸통을 강한 양봉이 감싸는 형태입니다. 하락 뒤 지지 구간에서 나오면 반전 시도로 해석하기 좋습니다.",
      en: "A strong bullish body engulfs the prior bearish body. It matters more after weakness and near support."
    }
  },
  {
    key: "hammer",
    title: { ko: "망치형", en: "Hammer" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    body: {
      ko: "긴 아래 꼬리와 작은 몸통이 특징입니다. 아래 가격을 밀었다가 다시 끌어올린 흔적으로, 지지 확인이 함께 나오면 더 좋습니다.",
      en: "It has a long lower wick and small body. It suggests downside rejection, especially if support also holds."
    }
  },
  {
    key: "morning_star",
    title: { ko: "샛별형", en: "Morning Star" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    body: {
      ko: "하락, 멈춤, 반등의 세 캔들 구조입니다. 세 번째 캔들의 회복 강도가 중요합니다.",
      en: "A three-candle reversal sequence: decline, pause, then recovery. The strength of the third candle matters."
    }
  },
  {
    key: "three_white_soldiers",
    title: { ko: "적삼병", en: "Three White Soldiers" },
    direction: { ko: "롱 관찰", en: "Long watch" },
    body: {
      ko: "연속적인 강한 양봉으로 매수세가 이어지는 모습입니다. 이미 많이 오른 구간이면 추격 리스크도 함께 봐야 합니다.",
      en: "Three strong bullish candles can show sustained demand, but chasing late after a stretch is still risky."
    }
  },
  {
    key: "bearish_engulfing",
    title: { ko: "하락 장악형", en: "Bearish Engulfing" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    body: {
      ko: "이전 양봉 몸통을 강한 음봉이 감싸는 구조입니다. 고점권이나 저항 부근에서 의미가 커집니다.",
      en: "A strong bearish body engulfs the prior bullish body. It matters more near highs or resistance."
    }
  },
  {
    key: "shooting_star",
    title: { ko: "유성형", en: "Shooting Star" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    body: {
      ko: "긴 위 꼬리와 작은 몸통이 특징입니다. 위 가격을 받아주지 못했다는 뜻이라 다음 캔들 약세 확인이 중요합니다.",
      en: "It shows upside rejection with a long upper wick. Follow-through weakness on the next candle matters."
    }
  },
  {
    key: "evening_star",
    title: { ko: "석별형", en: "Evening Star" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    body: {
      ko: "상승, 멈춤, 하락의 세 캔들 반전 구조입니다. 고점권에서 자주 주목받습니다.",
      en: "A three-candle bearish reversal sequence. Traders care more when it forms near highs."
    }
  },
  {
    key: "three_black_crows",
    title: { ko: "흑삼병", en: "Three Black Crows" },
    direction: { ko: "숏 관찰", en: "Short watch" },
    body: {
      ko: "연속적인 강한 음봉으로 매도 압력이 이어지는 구조입니다. 이미 과매도이면 뒤늦은 숏은 주의해야 합니다.",
      en: "Three strong bearish candles can show sustained selling, but late shorts after oversold damage can be risky."
    }
  }
] as const;

const chartPatterns = [
  {
    key: "head_and_shoulders",
    title: { ko: "헤드 앤 숄더", en: "Head and Shoulders" },
    body: {
      ko: "왼어깨, 머리, 오른어깨 구조로 반전 가능성을 보는 패턴입니다. 넥라인 이탈 전까지는 후보일 뿐입니다.",
      en: "A reversal structure with a left shoulder, head, and right shoulder. It is only a candidate until neckline loss confirms it."
    }
  },
  {
    key: "inverse_head_and_shoulders",
    title: { ko: "역 헤드 앤 숄더", en: "Inverse Head and Shoulders" },
    body: {
      ko: "바닥권 반전 패턴입니다. 넥라인 회복과 거래량 확인이 중요합니다.",
      en: "A bullish reversal structure from a bottoming area. Neckline reclaim and participation matter."
    }
  },
  {
    key: "bull_flag",
    title: { ko: "불 플래그", en: "Bull Flag" },
    body: {
      ko: "강한 상승 뒤 짧은 눌림이 이어지는 구조입니다. 플래그 상단 돌파가 핵심입니다.",
      en: "A strong impulse up followed by a shallow pullback. The key trigger is a break above the flag high."
    }
  },
  {
    key: "bear_flag",
    title: { ko: "베어 플래그", en: "Bear Flag" },
    body: {
      ko: "강한 하락 뒤 약한 반등이 이어지는 구조입니다. 플래그 하단 이탈을 봅니다.",
      en: "A strong impulse down followed by a weak bounce. Traders watch for a break below the flag low."
    }
  },
  {
    key: "bullish_pennant",
    title: { ko: "상승 페넌트", en: "Bullish Pennant" },
    body: {
      ko: "급등 뒤 수렴 삼각형이 생기는 지속 패턴입니다. 돌파 방향과 거래량이 중요합니다.",
      en: "A continuation setup where price compresses into a small triangle after a strong move up."
    }
  },
  {
    key: "bearish_pennant",
    title: { ko: "하락 페넌트", en: "Bearish Pennant" },
    body: {
      ko: "급락 뒤 수렴하는 하락 지속 패턴입니다. 하단 이탈 확인이 중요합니다.",
      en: "A bearish continuation setup where price compresses after a strong drop."
    }
  },
  {
    key: "ascending_triangle",
    title: { ko: "상승 삼각수렴", en: "Ascending Triangle" },
    body: {
      ko: "저점이 점점 높아지고 상단 저항은 비슷한 구조입니다. 상단 돌파를 많이 봅니다.",
      en: "Rising lows press into flat resistance. Traders often care most about the resistance breakout."
    }
  },
  {
    key: "descending_triangle",
    title: { ko: "하락 삼각수렴", en: "Descending Triangle" },
    body: {
      ko: "고점이 낮아지고 하단 지지는 버티는 구조입니다. 지지 이탈을 경계합니다.",
      en: "Lower highs press into flat support. Traders usually watch for support failure."
    }
  },
  {
    key: "symmetrical_triangle",
    title: { ko: "대칭 삼각수렴", en: "Symmetrical Triangle" },
    body: {
      ko: "고점은 낮아지고 저점은 높아지는 압축 패턴입니다. 방향보다는 실제 돌파가 중요합니다.",
      en: "A compression pattern with lower highs and higher lows. The actual break matters more than prediction."
    }
  },
  {
    key: "rising_wedge",
    title: { ko: "상승 쐐기", en: "Rising Wedge" },
    body: {
      ko: "고점과 저점이 함께 올라가지만 폭은 좁아집니다. 하방 실패 가능성을 자주 봅니다.",
      en: "Highs and lows both rise while the range tightens. Traders often watch for downside failure."
    }
  },
  {
    key: "falling_wedge",
    title: { ko: "하락 쐐기", en: "Falling Wedge" },
    body: {
      ko: "고점과 저점이 함께 낮아지지만 폭이 좁아지는 구조입니다. 상방 반전 후보로 자주 봅니다.",
      en: "Highs and lows both fall while the range tightens. Traders often treat it as an upside reversal candidate."
    }
  },
  {
    key: "double_top",
    title: { ko: "쌍봉", en: "Double Top" },
    body: {
      ko: "비슷한 고점을 두 번 두드리는 구조입니다. 중간 저점 붕괴가 확인 포인트입니다.",
      en: "Two failed pushes near the same high. The middle trough is the confirmation level."
    }
  },
  {
    key: "double_bottom",
    title: { ko: "쌍바닥", en: "Double Bottom" },
    body: {
      ko: "비슷한 저점을 두 번 방어하는 구조입니다. 중간 고점 돌파가 중요합니다.",
      en: "Two defenses near the same low. The middle peak is the confirmation level."
    }
  }
] as const;

const productCards = [
  {
    key: "call_option",
    diagram: "long_call",
    title: { ko: "콜옵션", en: "Call Option" },
    subtitle: { ko: "상승에 베팅하는 권리", en: "Right to benefit from upside" },
    body: {
      ko: "콜옵션은 특정 가격에 살 수 있는 권리입니다. 주가 상승을 기대할 때 쓰지만, 시간이 지나면 가치가 줄어드는 세타 손실과 변동성 변화의 영향을 같이 받습니다.",
      en: "A call option gives the right to buy at a strike. It can express upside conviction, but time decay and volatility changes matter."
    },
    use: {
      ko: "실적 전후, 돌파 전후, 강한 추세 continuation을 낮은 자본으로 노릴 때",
      en: "Useful when a trader wants upside exposure around catalysts or strong continuation with limited upfront capital"
    },
    risk: {
      ko: "만기까지 strike 위로 충분히 가지 못하면 프리미엄 대부분이 사라질 수 있음",
      en: "If price does not move far enough above strike before expiry, most of the premium can decay away"
    }
  },
  {
    key: "put_option",
    diagram: "long_put",
    title: { ko: "풋옵션", en: "Put Option" },
    subtitle: { ko: "하락에 베팅하는 권리", en: "Right to benefit from downside" },
    body: {
      ko: "풋옵션은 특정 가격에 팔 수 있는 권리입니다. 하락 베팅이나 기존 주식 포지션의 헷지로 씁니다. 급락을 노릴 수 있지만, 만기와 IV에 매우 민감합니다.",
      en: "A put option gives the right to sell at a strike. It can be used for downside speculation or hedging, but expiry and implied volatility matter a lot."
    },
    use: {
      ko: "약한 차트, 이벤트 리스크, 롱 포지션 보호",
      en: "Useful for bearish setups, event risk, or protecting a long stock position"
    },
    risk: {
      ko: "주가가 예상만큼 빠르게 밀리지 않으면 시간가치 손실이 큼",
      en: "If downside does not arrive quickly enough, time decay can erode value fast"
    }
  },
  {
    key: "covered_call",
    diagram: "covered_call",
    title: { ko: "커버드 콜", en: "Covered Call" },
    subtitle: { ko: "주식 보유 + 콜 매도", en: "Own stock + sell a call" },
    body: {
      ko: "기존 보유 주식 위에 콜옵션을 매도해 프리미엄 수익을 받는 전략입니다. 대신 주가가 크게 오르면 이익이 제한됩니다.",
      en: "A covered call sells call premium against stock already owned. It collects income but caps upside if the stock runs hard."
    },
    use: {
      ko: "강한 폭등보다 박스권 또는 완만한 상승을 보는 보유자",
      en: "Useful for holders expecting sideways-to-moderate upside rather than explosive breakout"
    },
    risk: {
      ko: "상승 잠재력이 제한되고, 주가 하락 자체는 여전히 주식 보유만큼 맞음",
      en: "Upside becomes capped, and downside stock risk still remains"
    }
  },
  {
    key: "protective_put",
    diagram: "protective_put",
    title: { ko: "프로텍티브 풋", en: "Protective Put" },
    subtitle: { ko: "주식 보유 + 풋 매수", en: "Own stock + buy a put" },
    body: {
      ko: "보유 주식의 하락 리스크를 제한하기 위해 풋옵션을 함께 매수합니다. 보험처럼 작동하지만 프리미엄 비용이 듭니다.",
      en: "A protective put buys downside insurance against stock already owned. It creates a floor under the position but costs premium."
    },
    use: {
      ko: "이벤트 전 보유 유지가 필요하지만 급락은 피하고 싶을 때",
      en: "Useful when the stock must be held through risk but a hard downside floor is desired"
    },
    risk: {
      ko: "보험료를 계속 내는 구조라 잦으면 성과를 깎을 수 있음",
      en: "Repeated premium spending can drag returns if the hedge is overused"
    }
  },
  {
    key: "cash_secured_put",
    diagram: "cash_secured_put",
    title: { ko: "캐시 시큐어드 풋", en: "Cash-Secured Put" },
    subtitle: { ko: "현금 준비 + 풋 매도", en: "Set cash aside + sell a put" },
    body: {
      ko: "정해진 가격에서 주식을 사도 괜찮다는 전제로 풋을 매도하고 프리미엄을 받는 전략입니다. 원하는 진입가를 낮추는 데 쓰이기도 합니다.",
      en: "A cash-secured put sells put premium with enough cash reserved to take assignment. Some traders use it to enter stock at a lower effective price."
    },
    use: {
      ko: "좋아하는 종목을 더 낮은 가격에 받고 싶을 때",
      en: "Useful when a trader wants to own a stock only at a lower effective entry"
    },
    risk: {
      ko: "주가가 크게 하락하면 결국 주식을 떠안게 되며 손실이 커질 수 있음",
      en: "If price collapses, the trader can still be assigned into a large losing stock position"
    }
  }
] as const;

const flowCards = [
  {
    key: "short-volume",
    title: { ko: "FINRA 일별 공매도 거래량", en: "FINRA Daily Short Sale Volume" },
    body: {
      ko: "일별 공매도 거래 비중입니다. 포지션 잔량이 아니라 그날 거래 중 숏 체결 비중이므로, 숏 인터레스트와 다른 데이터입니다.",
      en: "This is daily short-sale transaction volume, not short interest. It shows how much of that day involved short sales."
    },
    href: "https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data/daily-short-sale-volume-files"
  },
  {
    key: "short-interest",
    title: { ko: "숏 인터레스트 / DTC", en: "Short Interest / DTC" },
    body: {
      ko: "결제 기준일 기준 공매도 잔량과 일평균 거래량 대비 상환 기간입니다. squeeze 가능성, crowding 여부를 보는 데 유용하지만 실시간 데이터는 아닙니다.",
      en: "Short interest and days-to-cover are position-based, delayed context inputs. They help with squeeze and crowding analysis, not precise intraday timing."
    },
    href: "https://www.nasdaq.com/solutions/data/equities/short-interest"
  },
  {
    key: "dark-pool",
    title: { ko: "FINRA ATS / 다크풀 프록시", en: "FINRA ATS / Dark Pool Proxy" },
    body: {
      ko: "앱은 FINRA OTC ATS 주간 수량을 불러와 공매도 거래량 대비 비율을 보여줍니다. 둘은 서로 다른 지연 데이터라 정확한 실시간 숨은 매매 비율은 아닙니다.",
      en: "The app shows FINRA ATS weekly volume and compares it with short-volume data as a proxy. These are delayed datasets and not a direct live dark-pool ratio."
    },
    href: "https://www.finra.org/finra-data/browse-catalog/otc-transparency-data"
  },
  {
    key: "ftd",
    title: { ko: "SEC Fails-to-Deliver", en: "SEC Fails-to-Deliver" },
    body: {
      ko: "결제 실패 수량입니다. 숏과 관련될 수는 있지만, 이것만으로 불법 공매도라고 결론 내릴 수는 없습니다.",
      en: "Fails-to-deliver can be related to short activity, but they are not proof of abusive short selling on their own."
    },
    href: "https://www.sec.gov/data-research/sec-markets-data/fails-deliver-data"
  },
  {
    key: "put-call",
    title: { ko: "풋/콜 비율과 OI", en: "Put/Call Ratio and OI" },
    body: {
      ko: "근월물 옵션 체인의 풋/콜 거래량과 미결제약정 비율은 단기 심리와 헤지 수요를 읽는 데 도움됩니다. 방향성 신호가 아니라 보조 컨텍스트로 보는 게 좋습니다.",
      en: "Front-expiry put/call volume and open interest help frame short-term sentiment and hedging demand. Treat them as context, not certainty."
    },
    href: "https://www.cboe.com/us/options/market_statistics/"
  },
  {
    key: "level1",
    title: { ko: "체결창 / Level 1", en: "Time & Sales / Level 1" },
    body: {
      ko: "초봉과 함께 보면 실제 체결 속도, bid/ask 스프레드, 순간 가속을 읽기 좋습니다. 다만 v1은 Level 1까지만 지원하고 Level 2 호가잔량은 아닙니다.",
      en: "When combined with second candles, Time & Sales and Level 1 help read spread, tape speed, and short-term acceleration. This app does not include Level 2 depth."
    },
    href: "https://www.nasdaq.com/solutions/data/equities/nasdaq-totalview"
  }
] as const;

export default function LearnPage() {
  const [locale, setLocale] = useState<AppLocale>("ko");
  const [section, setSection] = useState<SectionId>("indicators");

  useEffect(() => {
    const saved = window.localStorage.getItem("trading-helper-locale");
    if (saved !== "ko" && saved !== "en") {
      return;
    }

    const handle = window.setTimeout(() => setLocale(saved), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const text = useMemo(() => copy[locale], [locale]);
  const hubCards = useMemo(
    () => [
      {
        id: "indicators" as const,
        icon: TrendingUp,
        count: indicatorCards.length,
        title: text.sections.indicators,
        description: text.sectionDescriptions.indicators
      },
      {
        id: "patterns" as const,
        icon: CandlestickChart,
        count: candlestickPatterns.length + chartPatterns.length,
        title: text.sections.patterns,
        description: text.sectionDescriptions.patterns
      },
      {
        id: "products" as const,
        icon: Layers3,
        count: productCards.length,
        title: text.sections.products,
        description: text.sectionDescriptions.products
      },
      {
        id: "flow" as const,
        icon: Shield,
        count: flowCards.length,
        title: text.sections.flow,
        description: text.sectionDescriptions.flow
      }
    ],
    [text]
  );

  return (
    <main className="learn-shell playbook-shell">
      <header className="learn-hero">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <div className="top-actions">
          <button className="small-action" type="button" onClick={() => changeLocale(locale === "en" ? "ko" : "en", setLocale)}>
            {locale === "en" ? "한국어" : "English"}
          </button>
          <Link className="learn-link" href="/">
            <Home size={17} aria-hidden />
            {text.dashboard}
          </Link>
        </div>
      </header>

      <section className="playbook-hub">
        {hubCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              className={section === card.id ? "playbook-card active" : "playbook-card"}
              onClick={() => setSection(card.id)}
            >
              <div className="playbook-card-top">
                <Icon size={20} aria-hidden />
                <span>{card.count}</span>
              </div>
              <strong>{card.title}</strong>
              <p>{card.description}</p>
            </button>
          );
        })}
      </section>

      <nav className="playbook-tabs" aria-label={text.title}>
        {(Object.keys(text.sections) as SectionId[]).map((item) => (
          <button key={item} type="button" className={section === item ? "active" : ""} onClick={() => setSection(item)}>
            {text.sections[item]}
          </button>
        ))}
      </nav>

      {section === "indicators" && (
        <>
          <section className="learn-section-title">
            <p className="eyebrow">{text.sections.indicators}</p>
            <h2>{text.indicatorsHeading}</h2>
          </section>
          <section className="learn-grid">
            {indicatorCards.map((card) => (
              <article key={card.key} className="learn-card">
                <BookOpen size={20} aria-hidden />
                <h2>{card.key}</h2>
                <p>{card.body[locale]}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {section === "patterns" && (
        <>
          <section className="learn-section-title">
            <p className="eyebrow">{text.sections.patterns}</p>
            <h2>{text.candlestickHeading}</h2>
          </section>
          <section className="learn-grid">
            {candlestickPatterns.map((card) => (
              <article key={card.key} className="learn-card pattern-card">
                <CandlestickPatternDiagram patternKey={card.key} title={card.title[locale]} />
                <h2>{card.title[locale]}</h2>
                <span className={card.direction.en === "Long watch" ? "learn-direction long" : "learn-direction short"}>
                  {card.direction[locale]}
                </span>
                <p>{card.body[locale]}</p>
              </article>
            ))}
          </section>

          <section className="learn-section-title">
            <p className="eyebrow">{text.sections.patterns}</p>
            <h2>{text.chartHeading}</h2>
          </section>
          <section className="learn-grid">
            {chartPatterns.map((card) => (
              <article key={card.key} className="learn-card pattern-card">
                <PatternDiagram patternKey={card.key} title={card.title[locale]} />
                <h2>{card.title[locale]}</h2>
                <p>{card.body[locale]}</p>
              </article>
            ))}
          </section>
        </>
      )}

      {section === "products" && (
        <>
          <section className="learn-section-title">
            <p className="eyebrow">{text.sections.products}</p>
            <h2>{text.productsHeading}</h2>
          </section>
          <section className="learn-grid product-grid">
            {productCards.map((card) => (
              <article key={card.key} className="learn-card product-card">
                <OptionPayoffDiagram diagramKey={card.diagram} title={card.title[locale]} />
                <h2>{card.title[locale]}</h2>
                <span className="product-subtitle">{card.subtitle[locale]}</span>
                <p>{card.body[locale]}</p>
                <div className="product-meta">
                  <div>
                    <dt>{text.whenUseful}</dt>
                    <dd>{card.use[locale]}</dd>
                  </div>
                  <div>
                    <dt>{text.coreRisk}</dt>
                    <dd>{card.risk[locale]}</dd>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {section === "flow" && (
        <>
          <section className="learn-section-title">
            <p className="eyebrow">{text.sections.flow}</p>
            <h2>{text.flowHeading}</h2>
          </section>
          <section className="learn-grid">
            {flowCards.map((card) => (
              <article key={card.key} className="learn-card">
                <BookOpen size={20} aria-hidden />
                <h2>{card.title[locale]}</h2>
                <p>{card.body[locale]}</p>
                <a className="source-link" href={card.href} target="_blank" rel="noreferrer">
                  {text.officialSource}
                </a>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function changeLocale(nextLocale: AppLocale, setLocale: (locale: AppLocale) => void) {
  setLocale(nextLocale);
  window.localStorage.setItem("trading-helper-locale", nextLocale);
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

function PatternDiagram({ patternKey, title }: { patternKey: ChartPatternKey; title: string }) {
  const path = patternPath(patternKey);
  const guides = patternGuides(patternKey);

  return (
    <svg className="pattern-diagram" viewBox="0 0 220 118" role="img" aria-label={title}>
      <rect x="1" y="1" width="218" height="116" rx="8" />
      {guides.map((guide) => {
        const [x1, y1, x2, y2] = guide.split(" ").map(Number);
        return <line key={guide} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <polyline points={path} />
    </svg>
  );
}

function OptionPayoffDiagram({ diagramKey, title }: { diagramKey: PayoffDiagramKey; title: string }) {
  const points = payoffPath(diagramKey);
  return (
    <svg className="pattern-diagram payoff-diagram" viewBox="0 0 220 118" role="img" aria-label={title}>
      <rect x="1" y="1" width="218" height="116" rx="8" />
      <line className="baseline" x1="16" y1="59" x2="204" y2="59" />
      <line className="baseline" x1="110" y1="16" x2="110" y2="102" />
      <polyline points={points} />
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

function patternPath(patternKey: ChartPatternKey): string {
  const paths: Record<ChartPatternKey, string> = {
    head_and_shoulders: "15,88 42,58 68,84 103,24 138,84 166,59 205,91",
    inverse_head_and_shoulders: "15,30 42,60 68,36 103,96 138,36 166,61 205,27",
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
    head_and_shoulders: ["34 84 176 84"],
    inverse_head_and_shoulders: ["34 36 176 36"],
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

function payoffPath(diagramKey: PayoffDiagramKey): string {
  const paths: Record<PayoffDiagramKey, string> = {
    long_call: "20,84 85,84 110,84 140,68 170,40 200,18",
    long_put: "20,18 50,34 80,56 110,84 140,84 200,84",
    covered_call: "20,86 80,58 110,42 150,32 200,32",
    protective_put: "20,72 80,72 110,56 150,38 200,20",
    cash_secured_put: "20,34 90,34 110,34 150,52 200,86"
  };

  return paths[diagramKey];
}

const copy = {
  ko: {
    eyebrow: "트레이딩 플레이북",
    title: "지표, 패턴, 금융상품을 한곳에서 보는 학습 허브",
    subtitle:
      "트레이딩 헬퍼에 나오는 신호를 그냥 따라보는 대신, 지표가 무엇을 말하는지, 차트 모양은 왜 중요한지, 옵션과 숏 데이터는 어떻게 해석해야 하는지 카테고리별로 정리했습니다.",
    dashboard: "대시보드",
    sections: {
      indicators: "지표",
      patterns: "그래프 모양",
      products: "금융상품",
      flow: "시장 데이터"
    },
    sectionDescriptions: {
      indicators: "EMA, RSI, MACD, VWAP 같은 핵심 지표",
      patterns: "캔들 패턴과 헤드앤숄더, 플래그 같은 구조",
      products: "콜옵션, 풋옵션, 커버드콜 등",
      flow: "숏 데이터, ATS, FTD, 체결 흐름"
    },
    indicatorsHeading: "대시보드 핵심 지표 읽는 법",
    candlestickHeading: "캔들 패턴",
    chartHeading: "차트 구조 패턴",
    productsHeading: "옵션과 대표 전략",
    flowHeading: "숏 데이터와 보조 컨텍스트",
    whenUseful: "언제 유용한가",
    coreRisk: "핵심 리스크",
    officialSource: "공식 자료"
  },
  en: {
    eyebrow: "Trading Playbook",
    title: "A learning hub for indicators, chart structures, and products",
    subtitle:
      "Instead of blindly following the dashboard, this page organizes what each indicator means, why chart shapes matter, and how options and short-flow context should be read.",
    dashboard: "Dashboard",
    sections: {
      indicators: "Indicators",
      patterns: "Chart Shapes",
      products: "Products",
      flow: "Market Data"
    },
    sectionDescriptions: {
      indicators: "EMA, RSI, MACD, VWAP, and other core reads",
      patterns: "Candlestick patterns plus structures like flags and head-and-shoulders",
      products: "Calls, puts, covered calls, and related strategies",
      flow: "Short data, ATS, FTD, and tape context"
    },
    indicatorsHeading: "How to read the main dashboard indicators",
    candlestickHeading: "Candlestick patterns",
    chartHeading: "Chart structure patterns",
    productsHeading: "Options and common strategies",
    flowHeading: "Short-flow and supporting context",
    whenUseful: "When it helps",
    coreRisk: "Core risk",
    officialSource: "Official source"
  }
} as const;
