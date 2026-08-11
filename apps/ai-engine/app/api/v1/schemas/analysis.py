"""Pydantic request/response schemas for the analysis API."""
from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

DISCLAIMER = (
    "This is technical analysis for educational purposes only. It is not investment "
    "advice and does not guarantee any outcome. Trading involves substantial risk of loss."
)


class OHLCVIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    open_time: int = Field(alias="openTime")
    open: float
    high: float
    low: float
    close: float
    volume: float


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    symbol: str
    exchange: str | None = None
    timeframe: str = "1d"
    candles: list[OHLCVIn] = Field(min_length=1)


class FactorOut(BaseModel):
    name: str
    direction: str
    weight: float
    contribution: float
    detail: str


class TargetOut(BaseModel):
    price: float
    rr: float
    label: str


class PatternOut(BaseModel):
    name: str
    category: str
    direction: str
    confidence: float
    bar_offset: int
    detail: str


class LevelOut(BaseModel):
    kind: str
    price: float
    strength: int
    distance_pct: float


class FrameIn(BaseModel):
    timeframe: str
    candles: list[OHLCVIn] = Field(min_length=1)


class MtfRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    symbol: str
    exchange: str | None = None
    frames: list[FrameIn] = Field(min_length=1)


class TimeframeAnalysisOut(BaseModel):
    timeframe: str
    signal: str
    confidence: float
    trend: str
    score: float


class MtfResponse(BaseModel):
    symbol: str
    signal: str
    confidence: float
    composite_score: float
    alignment: str
    frames: list[TimeframeAnalysisOut]
    summary: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    model_version: str = 'mtf-confluence-1.0'
    disclaimer: str = DISCLAIMER


class SmcRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    symbol: str
    exchange: str | None = None
    timeframe: str = "1d"
    candles: list[OHLCVIn] = Field(min_length=1)


class SmcResponse(BaseModel):
    symbol: str
    timeframe: str
    structure: str
    bias: str
    last_event: dict | None
    premium_discount: dict | None
    order_blocks: list[dict]
    fair_value_gaps: list[dict]
    liquidity: list[dict]
    summary: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    model_version: str = "smc-1.0"
    disclaimer: str = DISCLAIMER


class AnalyzeResponse(BaseModel):
    symbol: str
    timeframe: str
    signal: str
    confidence: float
    trend: str
    market_regime: str
    entry: float | None
    stop_loss: float | None
    targets: list[TargetOut]
    risk_reward: float | None
    holding_period: str | None
    reasons: list[FactorOut]
    rejection: list[str]
    indicators: dict
    patterns: list[PatternOut]
    levels: list[LevelOut]
    summary: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    model_version: str = "ta-signal-1.0"
    disclaimer: str = DISCLAIMER
