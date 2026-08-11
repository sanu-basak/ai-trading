"""Smart-Money-Concepts (SMC) analysis.

Pure, in-house detection of the core SMC / ICT building blocks:

  * market structure (bullish / bearish / ranging) from swing points,
  * the latest structural event — Break of Structure (BOS, continuation) vs
    Change of Character (CHoCH, potential reversal),
  * order blocks (origin candle of an impulsive, structure-breaking move),
  * fair-value gaps / imbalances (3-candle gaps),
  * liquidity pools (clusters of equal highs/lows where stops rest),
  * the premium/discount zone relative to the current dealing range.

Everything is derived from real OHLC data; nothing is synthesized.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd


@dataclass
class StructureEvent:
    kind: str  # "BOS" | "CHoCH"
    direction: str  # "bullish" | "bearish"
    price: float
    index: int


@dataclass
class OrderBlock:
    kind: str  # "bullish" | "bearish"
    top: float
    bottom: float
    index: int
    mitigated: bool


@dataclass
class FairValueGap:
    kind: str  # "bullish" | "bearish"
    top: float
    bottom: float
    index: int
    filled: bool


@dataclass
class Liquidity:
    kind: str  # "buy_side" (equal highs) | "sell_side" (equal lows)
    price: float
    touches: int


@dataclass
class PremiumDiscount:
    zone: str  # "premium" | "discount" | "equilibrium"
    equilibrium: float
    range_high: float
    range_low: float


@dataclass
class SmcResult:
    structure: str
    bias: str
    last_event: StructureEvent | None
    premium_discount: PremiumDiscount | None
    order_blocks: list[OrderBlock] = field(default_factory=list)
    fair_value_gaps: list[FairValueGap] = field(default_factory=list)
    liquidity: list[Liquidity] = field(default_factory=list)
    summary: str = ""


def _swings(df: pd.DataFrame, window: int = 3) -> list[tuple[int, float, str]]:
    highs, lows = df["high"].to_numpy(), df["low"].to_numpy()
    n = len(df)
    out: list[tuple[int, float, str]] = []
    for i in range(window, n - window):
        hseg = highs[i - window : i + window + 1]
        lseg = lows[i - window : i + window + 1]
        if int(hseg.argmax()) == window:
            out.append((i, float(highs[i]), "H"))
        if int(lseg.argmin()) == window:
            out.append((i, float(lows[i]), "L"))
    out.sort(key=lambda s: s[0])
    return out


def _structure(swings: list[tuple[int, float, str]]) -> str:
    highs = [s[1] for s in swings if s[2] == "H"]
    lows = [s[1] for s in swings if s[2] == "L"]
    hh = len(highs) >= 2 and highs[-1] > highs[-2]
    hl = len(lows) >= 2 and lows[-1] > lows[-2]
    lh = len(highs) >= 2 and highs[-1] < highs[-2]
    ll = len(lows) >= 2 and lows[-1] < lows[-2]
    if hh and hl:
        return "bullish"
    if lh and ll:
        return "bearish"
    return "ranging"


def _last_event(df: pd.DataFrame, swings: list[tuple[int, float, str]], structure: str) -> StructureEvent | None:
    close = float(df["close"].iloc[-1])
    last_idx = len(df) - 1
    highs = [s for s in swings if s[2] == "H"]
    lows = [s for s in swings if s[2] == "L"]

    if highs and close > highs[-1][1]:
        kind = "CHoCH" if structure == "bearish" else "BOS"
        return StructureEvent(kind=kind, direction="bullish", price=highs[-1][1], index=last_idx)
    if lows and close < lows[-1][1]:
        kind = "CHoCH" if structure == "bullish" else "BOS"
        return StructureEvent(kind=kind, direction="bearish", price=lows[-1][1], index=last_idx)
    return None


def _order_blocks(df: pd.DataFrame, lookback: int = 40) -> list[OrderBlock]:
    o, h, l, c = df["open"], df["high"], df["low"], df["close"]
    n = len(df)
    price = float(c.iloc[-1])
    start = max(1, n - lookback)
    blocks: list[OrderBlock] = []

    # Bullish OB: the last bearish candle before the highest high of the window.
    hi_idx = int(h.iloc[start:].idxmax())
    for j in range(hi_idx, start - 1, -1):
        if c.iloc[j] < o.iloc[j]:  # bearish candle = bullish order block origin
            top, bottom = float(h.iloc[j]), float(l.iloc[j])
            mitigated = bool(l.iloc[j + 1 :].min() <= top) if j + 1 < n else False
            blocks.append(OrderBlock("bullish", top, bottom, j, mitigated))
            break

    # Bearish OB: the last bullish candle before the lowest low of the window.
    lo_idx = int(l.iloc[start:].idxmin())
    for j in range(lo_idx, start - 1, -1):
        if c.iloc[j] > o.iloc[j]:  # bullish candle = bearish order block origin
            top, bottom = float(h.iloc[j]), float(l.iloc[j])
            mitigated = bool(h.iloc[j + 1 :].max() >= bottom) if j + 1 < n else False
            blocks.append(OrderBlock("bearish", top, bottom, j, mitigated))
            break

    _ = price
    return blocks


def _fair_value_gaps(df: pd.DataFrame, lookback: int = 60, max_gaps: int = 5) -> list[FairValueGap]:
    h, l = df["high"].to_numpy(), df["low"].to_numpy()
    n = len(df)
    gaps: list[FairValueGap] = []
    for i in range(max(2, n - lookback), n):
        # Bullish FVG: gap between candle i-2 high and candle i low.
        if l[i] > h[i - 2]:
            top, bottom = float(l[i]), float(h[i - 2])
            filled = bool(l[i + 1 :].min() <= bottom) if i + 1 < n else False
            gaps.append(FairValueGap("bullish", top, bottom, i, filled))
        # Bearish FVG: gap between candle i-2 low and candle i high.
        elif h[i] < l[i - 2]:
            top, bottom = float(l[i - 2]), float(h[i])
            filled = bool(h[i + 1 :].max() >= top) if i + 1 < n else False
            gaps.append(FairValueGap("bearish", top, bottom, i, filled))
    return gaps[-max_gaps:]


def _liquidity(swings: list[tuple[int, float, str]], tol_pct: float = 0.0015) -> list[Liquidity]:
    def cluster(points: list[float], kind: str) -> list[Liquidity]:
        clusters: list[list[float]] = []
        for p in sorted(points):
            if clusters and abs(p - clusters[-1][0]) <= clusters[-1][0] * tol_pct:
                clusters[-1].append(p)
            else:
                clusters.append([p])
        return [
            Liquidity(kind=kind, price=round(sum(c) / len(c), 4), touches=len(c))
            for c in clusters
            if len(c) >= 2
        ]

    highs = [s[1] for s in swings if s[2] == "H"]
    lows = [s[1] for s in swings if s[2] == "L"]
    return cluster(highs, "buy_side") + cluster(lows, "sell_side")


def _premium_discount(df: pd.DataFrame, lookback: int = 60) -> PremiumDiscount:
    window = df.iloc[-lookback:]
    range_high = float(window["high"].max())
    range_low = float(window["low"].min())
    equilibrium = (range_high + range_low) / 2.0
    price = float(df["close"].iloc[-1])
    span = max(range_high - range_low, 1e-9)
    if price > equilibrium + 0.05 * span:
        zone = "premium"
    elif price < equilibrium - 0.05 * span:
        zone = "discount"
    else:
        zone = "equilibrium"
    return PremiumDiscount(zone, round(equilibrium, 4), round(range_high, 4), round(range_low, 4))


def _bias(structure: str, event: StructureEvent | None, pd_zone: str) -> str:
    if event and event.kind == "CHoCH":
        return event.direction  # a change of character flags the new intended direction
    if structure == "bullish":
        return "bullish"
    if structure == "bearish":
        return "bearish"
    if pd_zone == "discount":
        return "bullish"
    if pd_zone == "premium":
        return "bearish"
    return "neutral"


def analyze(df: pd.DataFrame) -> SmcResult:
    if len(df) < 20:
        return SmcResult(
            structure="ranging",
            bias="neutral",
            last_event=None,
            premium_discount=None,
            summary="Not enough data for smart-money analysis.",
        )

    swings = _swings(df)
    structure = _structure(swings)
    event = _last_event(df, swings, structure)
    pd_zone = _premium_discount(df)
    bias = _bias(structure, event, pd_zone.zone)

    result = SmcResult(
        structure=structure,
        bias=bias,
        last_event=event,
        premium_discount=pd_zone,
        order_blocks=_order_blocks(df),
        fair_value_gaps=_fair_value_gaps(df),
        liquidity=_liquidity(swings),
        summary="",
    )
    result.summary = _summary(result)
    return result


def _summary(r: SmcResult) -> str:
    parts = [f"Market structure is {r.structure}."]
    if r.last_event:
        parts.append(
            f"Latest event: a {r.last_event.direction} {r.last_event.kind} "
            f"{'(reversal signal)' if r.last_event.kind == 'CHoCH' else '(trend continuation)'}."
        )
    if r.premium_discount:
        parts.append(
            f"Price is in the {r.premium_discount.zone} of the range "
            f"(equilibrium {r.premium_discount.equilibrium})."
        )
    unmit = [ob for ob in r.order_blocks if not ob.mitigated]
    if unmit:
        parts.append(f"{len(unmit)} unmitigated order block(s) in play.")
    open_fvg = [g for g in r.fair_value_gaps if not g.filled]
    if open_fvg:
        parts.append(f"{len(open_fvg)} open fair-value gap(s).")
    parts.append(f"Net smart-money bias: {r.bias}.")
    return " ".join(parts)
