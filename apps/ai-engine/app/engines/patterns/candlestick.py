"""Candlestick pattern detection (pure, in-house).

Operates on the final candles of an OHLC DataFrame and returns the reversal /
continuation patterns present near the current bar. Definitions follow the
classic Nison formulations. Detection is intentionally conservative (explicit
body/shadow ratios) to limit false positives.
"""
from __future__ import annotations

import pandas as pd

from app.domain.models import Pattern

_DOJI_BODY_RATIO = 0.1
_LONG_SHADOW_RATIO = 2.0
_MARUBOZU_BODY_RATIO = 0.9


def _metrics(row: pd.Series) -> dict:
    o, h, l, c = float(row["open"]), float(row["high"]), float(row["low"]), float(row["close"])
    rng = max(h - l, 1e-12)
    body = abs(c - o)
    return {
        "o": o, "h": h, "l": l, "c": c,
        "range": rng,
        "body": body,
        "upper": h - max(o, c),
        "lower": min(o, c) - l,
        "bullish": c > o,
        "bearish": c < o,
        "body_ratio": body / rng,
    }


def detect(df: pd.DataFrame) -> list[Pattern]:
    """Detect candlestick patterns in the last few candles."""
    if len(df) < 3:
        return []

    rows = [_metrics(df.iloc[i]) for i in range(len(df))]
    n = len(rows)
    last, prev, prev2 = rows[-1], rows[-2], rows[-3]
    patterns: list[Pattern] = []

    def add(name: str, direction: str, confidence: float, offset: int, detail: str) -> None:
        patterns.append(
            Pattern(name=name, category="CANDLESTICK", direction=direction,
                    confidence=round(confidence, 1), bar_offset=offset, detail=detail)
        )

    # --- Single-candle (evaluated on the last bar) ---
    if last["body_ratio"] <= _DOJI_BODY_RATIO:
        add("doji", "neutral", 55, 0, "Doji: open and close nearly equal — indecision.")

    if (
        last["lower"] >= _LONG_SHADOW_RATIO * last["body"]
        and last["upper"] <= last["body"]
        and last["body"] > 0
    ):
        add("hammer", "bullish", 65, 0,
            "Hammer: long lower shadow rejecting lower prices — potential bullish reversal.")

    if (
        last["upper"] >= _LONG_SHADOW_RATIO * last["body"]
        and last["lower"] <= last["body"]
        and last["body"] > 0
    ):
        add("shooting_star", "bearish", 65, 0,
            "Shooting star: long upper shadow rejecting higher prices — potential bearish reversal.")

    if last["body_ratio"] >= _MARUBOZU_BODY_RATIO:
        add("marubozu", "bullish" if last["bullish"] else "bearish", 60, 0,
            f"Marubozu: a full-bodied {'bullish' if last['bullish'] else 'bearish'} candle — strong conviction.")

    # --- Two-candle (last vs previous) ---
    if last["bullish"] and prev["bearish"] and last["c"] >= prev["o"] and last["o"] <= prev["c"]:
        add("bullish_engulfing", "bullish", 72, 0,
            "Bullish engulfing: the up candle fully engulfs the prior down candle.")
    if last["bearish"] and prev["bullish"] and last["o"] >= prev["c"] and last["c"] <= prev["o"]:
        add("bearish_engulfing", "bearish", 72, 0,
            "Bearish engulfing: the down candle fully engulfs the prior up candle.")

    # Harami (inside bar of opposite colour)
    if (
        prev["body"] > 0
        and max(last["o"], last["c"]) <= max(prev["o"], prev["c"])
        and min(last["o"], last["c"]) >= min(prev["o"], prev["c"])
    ):
        if prev["bearish"] and last["bullish"]:
            add("bullish_harami", "bullish", 58, 0, "Bullish harami: small up candle inside prior down candle.")
        elif prev["bullish"] and last["bearish"]:
            add("bearish_harami", "bearish", 58, 0, "Bearish harami: small down candle inside prior up candle.")

    # Piercing line / Dark cloud cover
    prev_mid = (prev["o"] + prev["c"]) / 2
    if prev["bearish"] and last["bullish"] and last["o"] < prev["l"] and prev["c"] < last["c"] < prev["o"] and last["c"] > prev_mid:
        add("piercing_line", "bullish", 66, 0, "Piercing line: strong close back above the prior candle's midpoint.")
    if prev["bullish"] and last["bearish"] and last["o"] > prev["h"] and prev["o"] < last["c"] < prev["c"] and last["c"] < prev_mid:
        add("dark_cloud_cover", "bearish", 66, 0, "Dark cloud cover: strong close back below the prior candle's midpoint.")

    # --- Three-candle ---
    first_mid = (prev2["o"] + prev2["c"]) / 2
    if prev2["bearish"] and prev["body_ratio"] < 0.4 and last["bullish"] and last["c"] > first_mid:
        add("morning_star", "bullish", 74, 0, "Morning star: down candle, indecision, then a strong up candle — bullish reversal.")
    if prev2["bullish"] and prev["body_ratio"] < 0.4 and last["bearish"] and last["c"] < first_mid:
        add("evening_star", "bearish", 74, 0, "Evening star: up candle, indecision, then a strong down candle — bearish reversal.")

    if (
        prev2["bullish"] and prev["bullish"] and last["bullish"]
        and last["c"] > prev["c"] > prev2["c"]
        and last["upper"] <= last["body"]
    ):
        add("three_white_soldiers", "bullish", 70, 0, "Three white soldiers: three rising bullish candles — sustained buying.")
    if (
        prev2["bearish"] and prev["bearish"] and last["bearish"]
        and last["c"] < prev["c"] < prev2["c"]
        and last["lower"] <= last["body"]
    ):
        add("three_black_crows", "bearish", 70, 0, "Three black crows: three falling bearish candles — sustained selling.")

    _ = n  # reserved for future multi-bar scans
    return patterns
