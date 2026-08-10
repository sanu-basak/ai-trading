"""Explainable technical-analysis signal engine.

Combines multiple independent indicators into a single, transparent
recommendation. Every factor's weighted contribution is recorded, so the output
can always answer "why". The engine is deliberately conservative: when the
market is choppy or signals conflict, it returns NO_TRADE with reasons rather
than forcing a call. It never expresses or implies a guaranteed outcome.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

from app.core.config import settings
from app.domain.models import (
    AnalysisOutcome,
    Factor,
    MarketRegime,
    SignalType,
    Target,
    TrendDirection,
)
from app.engines.technical import indicators as ind
from app.engines.patterns import candlestick
from app.engines.price_action import levels as levels_engine

MIN_CANDLES = 30

# Timeframe → a human holding-period hint.
_HOLDING_PERIOD = {
    "1m": "scalp (minutes)",
    "3m": "scalp (minutes)",
    "5m": "intraday",
    "15m": "intraday",
    "30m": "intraday",
    "1h": "1–3 days",
    "4h": "swing (3–10 days)",
    "1d": "swing / positional (weeks)",
    "1w": "positional (months)",
    "1M": "long term",
}


def _last(series: pd.Series) -> float | None:
    if series is None or len(series) == 0:
        return None
    val = series.iloc[-1]
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    return float(val)


def _round(value: float | None, digits: int = 4) -> float | None:
    return None if value is None else round(value, digits)


def analyze(df: pd.DataFrame, timeframe: str = "1d") -> AnalysisOutcome:
    """Analyze an OHLCV DataFrame and return an explainable recommendation."""
    n = len(df)
    if n < MIN_CANDLES:
        return AnalysisOutcome(
            signal=SignalType.NO_TRADE,
            confidence=0.0,
            trend=TrendDirection.SIDEWAYS,
            market_regime=MarketRegime.CHOPPY,
            entry=None,
            stop_loss=None,
            targets=[],
            risk_reward=None,
            holding_period=None,
            rejection=[f"Insufficient history: {n} candles (need at least {MIN_CANDLES})."],
            summary="Not enough data to analyze this instrument reliably.",
        )

    close, high, low, volume = df["close"], df["high"], df["low"], df["volume"]

    # --- Indicators ---
    ema20 = ind.ema(close, 20)
    ema50 = ind.ema(close, 50) if n >= 50 else ema20
    ema200 = ind.ema(close, 200) if n >= 200 else None
    rsi14 = ind.rsi(close, 14)
    macd_line, macd_signal, macd_hist = ind.macd(close)
    atr14 = ind.atr(high, low, close, 14)
    adx14, plus_di, minus_di = ind.adx(high, low, close, 14)
    bb_upper, bb_mid, bb_lower = ind.bollinger_bands(close, 20, 2.0)
    vwap_ = ind.vwap(high, low, close, volume)
    st_line, st_dir = ind.supertrend(high, low, close, 10, 3.0)

    price = float(close.iloc[-1])
    v_ema20 = _last(ema20)
    v_ema50 = _last(ema50)
    v_ema200 = _last(ema200) if ema200 is not None else None
    v_rsi = _last(rsi14)
    v_hist = _last(macd_hist)
    v_hist_prev = float(macd_hist.iloc[-2]) if len(macd_hist) >= 2 and not math.isnan(macd_hist.iloc[-2]) else None
    v_atr = _last(atr14)
    v_adx = _last(adx14)
    v_pdi = _last(plus_di)
    v_mdi = _last(minus_di)
    v_vwap = _last(vwap_)
    v_st_dir = _last(st_dir)

    factors: list[Factor] = []
    weighted_sum = 0.0
    weight_total = 0.0

    def add(name: str, raw_dir: float, weight: float, detail: str) -> None:
        nonlocal weighted_sum, weight_total
        d = max(-1.0, min(1.0, raw_dir))
        contribution = d * weight
        weighted_sum += contribution
        weight_total += weight
        direction = "bullish" if d > 0.05 else "bearish" if d < -0.05 else "neutral"
        factors.append(
            Factor(name=name, direction=direction, weight=weight, contribution=round(contribution, 4), detail=detail)
        )

    # 1) Long-term trend (EMA50 vs EMA200, or price vs EMA50 as fallback)
    if v_ema200 is not None and v_ema50 is not None:
        d = 1.0 if v_ema50 > v_ema200 else -1.0
        add("trend_ema50_200", d, 0.22,
            f"EMA50 {v_ema50:.2f} is {'above' if d > 0 else 'below'} EMA200 {v_ema200:.2f} "
            f"({'up' if d > 0 else 'down'} trend).")
    elif v_ema50 is not None:
        d = 1.0 if price > v_ema50 else -1.0
        add("trend_price_ema50", d, 0.22,
            f"Price {price:.2f} is {'above' if d > 0 else 'below'} EMA50 {v_ema50:.2f}.")

    # 2) Price vs EMA20 (short-term momentum of price)
    if v_ema20 is not None:
        d = 1.0 if price > v_ema20 else -1.0
        add("price_ema20", d, 0.10,
            f"Price {price:.2f} is {'above' if d > 0 else 'below'} EMA20 {v_ema20:.2f}.")

    # 3) RSI
    if v_rsi is not None:
        d = (v_rsi - 50.0) / 30.0
        note = "overbought" if v_rsi >= 70 else "oversold" if v_rsi <= 30 else "neutral"
        add("rsi", d, 0.13, f"RSI(14) is {v_rsi:.1f} ({note}).")

    # 4) MACD histogram (momentum + slope)
    if v_hist is not None:
        slope = 0.0
        if v_hist_prev is not None:
            slope = 0.3 if v_hist > v_hist_prev else -0.3
        d = (1.0 if v_hist > 0 else -1.0) + slope
        add("macd", d, 0.15,
            f"MACD histogram is {v_hist:.4f} and {'rising' if slope > 0 else 'falling' if slope < 0 else 'flat'}.")

    # 5) ADX / directional movement (trend strength + direction)
    if v_adx is not None and v_pdi is not None and v_mdi is not None:
        if v_adx >= 20:
            d = 1.0 if v_pdi > v_mdi else -1.0
            add("adx", d, 0.20,
                f"ADX {v_adx:.1f} shows a {'strong' if v_adx >= 25 else 'developing'} trend; "
                f"+DI {v_pdi:.1f} vs -DI {v_mdi:.1f}.")
        else:
            add("adx", 0.0, 0.20, f"ADX {v_adx:.1f} indicates no clear trend (range-bound).")

    # 6) SuperTrend direction
    if v_st_dir is not None:
        add("supertrend", 1.0 if v_st_dir > 0 else -1.0, 0.10,
            f"SuperTrend direction is {'up' if v_st_dir > 0 else 'down'}.")

    # 7) VWAP
    if v_vwap is not None:
        d = 1.0 if price > v_vwap else -1.0
        add("vwap", d, 0.10, f"Price is {'above' if d > 0 else 'below'} VWAP {v_vwap:.2f}.")

    # 8) Candlestick patterns — the strongest recent directional pattern nudges the score.
    detected_patterns = candlestick.detect(df)
    key_levels = levels_engine.detect(df)
    directional_patterns = [p for p in detected_patterns if p.direction in ("bullish", "bearish")]
    if directional_patterns:
        top = max(directional_patterns, key=lambda p: p.confidence)
        add(
            "candlestick",
            1.0 if top.direction == "bullish" else -1.0,
            0.10,
            f"{top.name.replace('_', ' ').title()} — {top.detail}",
        )

    score = weighted_sum / weight_total if weight_total > 0 else 0.0

    # --- Trend & regime ---
    if v_adx is not None and v_adx >= 25:
        regime = MarketRegime.TRENDING_UP if score > 0 else MarketRegime.TRENDING_DOWN
    elif v_adx is not None and v_adx < 18:
        regime = MarketRegime.CHOPPY if abs(score) < 0.2 else MarketRegime.RANGING
    else:
        regime = MarketRegime.RANGING
    trend = TrendDirection.UP if score > 0.15 else TrendDirection.DOWN if score < -0.15 else TrendDirection.SIDEWAYS

    # --- Decision ---
    # In a weak-trend (low-ADX) regime, momentum readings are unreliable, so the
    # score is dampened: the engine demands a much stronger consensus before it
    # will act, and otherwise stands aside. This encodes "reject bad trades".
    rejection: list[str] = []
    weak_trend = v_adx is not None and v_adx < 20
    decision_score = score * 0.6 if weak_trend else score

    if weak_trend and abs(score) < 0.35:
        signal = SignalType.NO_TRADE
        rejection.append(
            f"ADX {v_adx:.1f} signals a weak/absent trend and the composite conviction "
            f"({score:+.2f}) is low — standing aside is the higher-probability choice."
        )
    elif decision_score >= 0.30:
        signal = SignalType.BUY
    elif decision_score <= -0.30:
        signal = SignalType.SELL
    elif abs(decision_score) >= 0.15:
        signal = SignalType.WATCH
    else:
        signal = SignalType.NO_TRADE
        rejection.append(
            f"Signals are mixed (conviction {score:+.2f}); no edge is clear enough to act on."
        )

    if v_rsi is not None:
        if signal == SignalType.BUY and v_rsi >= 75:
            rejection.append(f"Caution: RSI {v_rsi:.0f} is overbought — entry may be extended.")
        if signal == SignalType.SELL and v_rsi <= 25:
            rejection.append(f"Caution: RSI {v_rsi:.0f} is oversold — a bounce is possible.")

    # --- Entry / stop / targets (only for actionable directional signals) ---
    entry = stop_loss = risk_reward = None
    targets: list[Target] = []
    stop_mult = settings.default_atr_stop_mult
    base_rr = settings.default_risk_reward

    if signal in (SignalType.BUY, SignalType.SELL, SignalType.WATCH) and v_atr is not None and v_atr > 0:
        entry = round(price, 4)
        direction_long = signal != SignalType.SELL
        if direction_long:
            stop_loss = round(price - stop_mult * v_atr, 4)
            risk = entry - stop_loss
            targets = [
                Target(price=round(entry + mult * risk, 4), rr=mult, label=f"T{i + 1}")
                for i, mult in enumerate((1.0, base_rr, base_rr + 1.0))
            ]
        else:
            stop_loss = round(price + stop_mult * v_atr, 4)
            risk = stop_loss - entry
            targets = [
                Target(price=round(entry - mult * risk, 4), rr=mult, label=f"T{i + 1}")
                for i, mult in enumerate((1.0, base_rr, base_rr + 1.0))
            ]
        risk_reward = round(base_rr, 2)

    # --- Confidence (never 100: outcomes are never guaranteed) ---
    adx_bonus = 10.0 if (v_adx is not None and v_adx >= 25) else 0.0
    confidence = round(min(95.0, 40.0 + abs(score) * 45.0 + adx_bonus), 1)
    if signal == SignalType.NO_TRADE:
        # Confidence here expresses conviction in *not* trading.
        confidence = round(min(95.0, 55.0 + (0.35 - min(abs(score), 0.35)) * 100.0), 1)

    indicators_snapshot = {
        "price": _round(price),
        "ema20": _round(v_ema20),
        "ema50": _round(v_ema50),
        "ema200": _round(v_ema200),
        "rsi14": _round(v_rsi, 2),
        "macd_hist": _round(v_hist, 6),
        "atr14": _round(v_atr),
        "adx14": _round(v_adx, 2),
        "plus_di": _round(v_pdi, 2),
        "minus_di": _round(v_mdi, 2),
        "vwap": _round(v_vwap),
        "bb_upper": _round(_last(bb_upper)),
        "bb_lower": _round(_last(bb_lower)),
        "supertrend_dir": None if v_st_dir is None else int(v_st_dir),
    }

    summary = _build_summary(signal, trend, regime, score, v_adx, v_rsi)

    return AnalysisOutcome(
        signal=signal,
        confidence=confidence,
        trend=trend,
        market_regime=regime,
        entry=entry,
        stop_loss=stop_loss,
        targets=targets,
        risk_reward=risk_reward,
        holding_period=_HOLDING_PERIOD.get(timeframe) if signal in (SignalType.BUY, SignalType.SELL) else None,
        reasons=factors,
        rejection=rejection,
        indicators=indicators_snapshot,
        patterns=detected_patterns,
        levels=key_levels,
        summary=summary,
        score=round(score, 4),
    )


def _build_summary(
    signal: SignalType,
    trend: TrendDirection,
    regime: MarketRegime,
    score: float,
    adx: float | None,
    rsi: float | None,
) -> str:
    adx_txt = f"ADX {adx:.0f}" if adx is not None else "trend strength unknown"
    rsi_txt = f"RSI {rsi:.0f}" if rsi is not None else ""
    parts = [
        f"Composite conviction {score:+.2f} in a {regime.value.replace('_', ' ').lower()} regime ({adx_txt}).",
    ]
    if rsi_txt:
        parts.append(rsi_txt + ".")
    if signal == SignalType.BUY:
        parts.append("Technicals lean bullish; a long setup is present with the noted risk levels.")
    elif signal == SignalType.SELL:
        parts.append("Technicals lean bearish; a short setup is present with the noted risk levels.")
    elif signal == SignalType.WATCH:
        parts.append("A bias is forming but conviction is moderate — worth watching, not yet acting.")
    else:
        parts.append("No high-probability setup right now; standing aside preserves capital.")
    return " ".join(parts)
