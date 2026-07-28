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
    summary: str = ""
