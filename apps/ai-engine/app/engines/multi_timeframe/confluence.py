"""Multi-timeframe confluence.

Combines the single-timeframe analyses of the same instrument into one
composite view. Higher timeframes carry more weight (they define the dominant
trend), and agreement across timeframes raises confidence while conflict lowers
it and biases toward standing aside. This mirrors how discretionary traders use
a top-down, higher-timeframe-first workflow.
"""
from __future__ import annotations

from app.domain.models import (
    AnalysisOutcome,
    MtfOutcome,
    SignalType,
    TimeframeResult,
    TrendDirection,
)

# Relative weight by timeframe — higher timeframes dominate.
TIMEFRAME_WEIGHTS: dict[str, float] = {
    "1m": 0.5,
    "3m": 0.6,
    "5m": 0.7,
    "15m": 0.8,
    "30m": 0.9,
    "1h": 1.0,
    "4h": 1.4,
    "1d": 1.8,
    "1w": 2.2,
    "1M": 2.5,
}

_BULL_THRESHOLD = 0.15
_BEAR_THRESHOLD = -0.15


def combine(symbol: str, results: list[tuple[str, AnalysisOutcome]]) -> MtfOutcome:
    """Combine per-timeframe outcomes into a multi-timeframe recommendation."""
    frames: list[TimeframeResult] = [
        TimeframeResult(
            timeframe=tf,
            signal=outcome.signal,
            confidence=outcome.confidence,
            trend=outcome.trend,
            score=outcome.score,
        )
        for tf, outcome in results
    ]

    if not frames:
        return MtfOutcome(
            symbol=symbol,
            signal=SignalType.NO_TRADE,
            confidence=0.0,
            composite_score=0.0,
            alignment="neutral",
            frames=[],
            summary="No timeframes were provided to analyze.",
        )

    weight_total = sum(TIMEFRAME_WEIGHTS.get(f.timeframe, 1.0) for f in frames)
    weighted = sum(TIMEFRAME_WEIGHTS.get(f.timeframe, 1.0) * f.score for f in frames)
    composite = weighted / weight_total if weight_total > 0 else 0.0

    bull = [f for f in frames if f.score > _BULL_THRESHOLD]
    bear = [f for f in frames if f.score < _BEAR_THRESHOLD]

    if bull and not bear:
        alignment = "aligned_bullish"
    elif bear and not bull:
        alignment = "aligned_bearish"
    elif bull and bear:
        alignment = "mixed"
    else:
        alignment = "neutral"

    aligned = alignment in ("aligned_bullish", "aligned_bearish")

    # Decision: conflict across timeframes demands stronger conviction to act.
    signal = SignalType.NO_TRADE
    if alignment == "mixed" and abs(composite) < 0.35:
        signal = SignalType.NO_TRADE
    elif composite >= 0.30:
        signal = SignalType.BUY
    elif composite <= -0.30:
        signal = SignalType.SELL
    elif abs(composite) >= 0.15:
        signal = SignalType.WATCH

    confidence = round(min(90.0, 45.0 + abs(composite) * 40.0 + (12.0 if aligned else 0.0)), 1)
    if signal == SignalType.NO_TRADE:
        confidence = round(min(90.0, 55.0 + (0.35 - min(abs(composite), 0.35)) * 90.0), 1)

    return MtfOutcome(
        symbol=symbol,
        signal=signal,
        confidence=confidence,
        composite_score=round(composite, 4),
        alignment=alignment,
        frames=frames,
        summary=_summary(symbol, signal, alignment, composite, frames),
    )


def _summary(
    symbol: str,
    signal: SignalType,
    alignment: str,
    composite: float,
    frames: list[TimeframeResult],
) -> str:
    def arrow(t: TrendDirection) -> str:
        return "(up)" if t == TrendDirection.UP else "(down)" if t == TrendDirection.DOWN else "(flat)"

    per_tf = ", ".join(
        f"{f.timeframe} {f.signal.value.replace('_', ' ')} {arrow(f.trend)}" for f in frames
    )
    align_txt = {
        "aligned_bullish": "Timeframes are aligned bullish",
        "aligned_bearish": "Timeframes are aligned bearish",
        "mixed": "Timeframes conflict",
        "neutral": "Timeframes are broadly neutral",
    }[alignment]
    tail = {
        SignalType.BUY: "a long bias is supported across the stack.",
        SignalType.SELL: "a short bias is supported across the stack.",
        SignalType.WATCH: "a bias is forming but is not yet decisive.",
        SignalType.NO_TRADE: "there is no clear multi-timeframe edge — standing aside.",
    }[signal]
    return f"{align_txt} (composite {composite:+.2f}) for {symbol}: {per_tf}. Overall, {tail}"
