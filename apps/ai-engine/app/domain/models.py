"""Domain models for analysis results (framework-agnostic dataclasses)."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    NO_TRADE = "NO_TRADE"
    WATCH = "WATCH"


class TrendDirection(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    SIDEWAYS = "SIDEWAYS"


class MarketRegime(str, Enum):
    TRENDING_UP = "TRENDING_UP"
    TRENDING_DOWN = "TRENDING_DOWN"
    RANGING = "RANGING"
    VOLATILE = "VOLATILE"
    CHOPPY = "CHOPPY"


@dataclass
class Factor:
    """A single weighted reason contributing to the recommendation."""

    name: str
    direction: str  # "bullish" | "bearish" | "neutral"
    weight: float
    contribution: float  # signed, weight-scaled contribution to the score
    detail: str


@dataclass
class Target:
    price: float
    rr: float
    label: str


@dataclass
class Pattern:
    """A detected candlestick / chart pattern near the end of the series."""

    name: str
    category: str  # "CANDLESTICK" | "CHART" | "PRICE_ACTION"
    direction: str  # "bullish" | "bearish" | "neutral"
    confidence: float  # 0-100
    bar_offset: int  # 0 = most recent candle
    detail: str


@dataclass
class Level:
    """A support or resistance price level derived from swing pivots."""

    kind: str  # "support" | "resistance"
    price: float
    strength: int  # number of pivots forming the level
    distance_pct: float  # signed distance from current price, %


@dataclass
class AnalysisOutcome:
    signal: SignalType
    confidence: float
    trend: TrendDirection
    market_regime: MarketRegime
    entry: float | None
    stop_loss: float | None
    targets: list[Target]
    risk_reward: float | None
    holding_period: str | None
    reasons: list[Factor] = field(default_factory=list)
    rejection: list[str] = field(default_factory=list)
    indicators: dict = field(default_factory=dict)
    patterns: list[Pattern] = field(default_factory=list)
    levels: list[Level] = field(default_factory=list)
    summary: str = ""
