"""Support / resistance detection from swing pivots.

Finds fractal swing highs/lows, clusters nearby pivots into price levels, and
classifies each as support (below price) or resistance (above price) with a
strength equal to the number of touches. Pure and deterministic.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.domain.models import Level


def _pivots(values: np.ndarray, window: int, kind: str) -> list[float]:
    out: list[float] = []
    n = len(values)
    for i in range(window, n - window):
        seg = values[i - window : i + window + 1]
        center = window
        if kind == "high" and int(seg.argmax()) == center:
            out.append(float(values[i]))
        elif kind == "low" and int(seg.argmin()) == center:
            out.append(float(values[i]))
    return out


def _cluster(prices: list[float], tol_pct: float) -> list[tuple[float, int]]:
    """Cluster prices within tol_pct of each other. Returns (level, strength)."""
    clusters: list[tuple[float, int]] = []
    for p in sorted(prices):
        if clusters and abs(p - clusters[-1][0]) <= clusters[-1][0] * tol_pct:
            mean, count = clusters[-1]
            clusters[-1] = ((mean * count + p) / (count + 1), count + 1)
        else:
            clusters.append((p, 1))
    return clusters


def detect(
    df: pd.DataFrame,
    window: int = 3,
    tol_pct: float = 0.004,
    max_levels: int = 6,
) -> list[Level]:
    if len(df) < 2 * window + 1:
        return []

    price = float(df["close"].iloc[-1])
    highs = _pivots(df["high"].to_numpy(), window, "high")
    lows = _pivots(df["low"].to_numpy(), window, "low")

    clusters = _cluster(highs + lows, tol_pct)
    levels: list[Level] = []
    for level_price, strength in clusters:
        if strength < 2:  # require at least two touches to be meaningful
            continue
        distance_pct = (level_price - price) / price * 100.0
        kind = "resistance" if level_price >= price else "support"
        levels.append(
            Level(kind=kind, price=round(level_price, 4), strength=strength,
                  distance_pct=round(distance_pct, 3))
        )

    # Keep the levels closest to the current price (most actionable).
    levels.sort(key=lambda lv: abs(lv.distance_pct))
    return levels[:max_levels]
