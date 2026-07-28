"""Orchestrates candle validation, indicator computation and signal generation."""
from __future__ import annotations

import pandas as pd

from app.api.v1.schemas.analysis import AnalyzeRequest, AnalyzeResponse, FactorOut, TargetOut
from app.domain.models import AnalysisOutcome
from app.engines import signal_engine


def build_dataframe(request: AnalyzeRequest) -> pd.DataFrame:
    """Builds a clean, time-sorted OHLCV DataFrame from the request candles."""
    rows = [
        {
            "open_time": c.open_time,
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close,
            "volume": c.volume,
        }
        for c in request.candles
    ]
    df = pd.DataFrame(rows)
    df = df.drop_duplicates(subset="open_time").sort_values("open_time").reset_index(drop=True)
    return df


def _to_response(request: AnalyzeRequest, outcome: AnalysisOutcome) -> AnalyzeResponse:
    return AnalyzeResponse(
        symbol=request.symbol,
        timeframe=request.timeframe,
        signal=outcome.signal.value,
        confidence=outcome.confidence,
        trend=outcome.trend.value,
        market_regime=outcome.market_regime.value,
        entry=outcome.entry,
        stop_loss=outcome.stop_loss,
        targets=[TargetOut(price=t.price, rr=t.rr, label=t.label) for t in outcome.targets],
        risk_reward=outcome.risk_reward,
        holding_period=outcome.holding_period,
        reasons=[
            FactorOut(
                name=f.name,
                direction=f.direction,
                weight=f.weight,
                contribution=f.contribution,
                detail=f.detail,
            )
            for f in outcome.reasons
        ],
        rejection=outcome.rejection,
        indicators=outcome.indicators,
        summary=outcome.summary,
    )


def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    df = build_dataframe(request)
    outcome = signal_engine.analyze(df, timeframe=request.timeframe)
    return _to_response(request, outcome)
