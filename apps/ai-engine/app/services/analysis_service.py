"""Orchestrates candle validation, indicator computation and signal generation."""
from __future__ import annotations

import pandas as pd

from app.api.v1.schemas.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    FactorOut,
    LevelOut,
    BacktestRequest,
    BacktestResponse,
    MtfRequest,
    MtfResponse,
    PatternOut,
    SmcRequest,
    SmcResponse,
    TargetOut,
    TimeframeAnalysisOut,
)
from app.domain.models import AnalysisOutcome
from app.engines import signal_engine
from app.engines.multi_timeframe import confluence
from app.engines.smart_money import smc as smc_engine
from app.engines.backtest import backtester
from dataclasses import asdict


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
        patterns=[
            PatternOut(
                name=p.name,
                category=p.category,
                direction=p.direction,
                confidence=p.confidence,
                bar_offset=p.bar_offset,
                detail=p.detail,
            )
            for p in outcome.patterns
        ],
        levels=[
            LevelOut(kind=lv.kind, price=lv.price, strength=lv.strength, distance_pct=lv.distance_pct)
            for lv in outcome.levels
        ],
        summary=outcome.summary,
    )


def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    df = build_dataframe(request)
    outcome = signal_engine.analyze(df, timeframe=request.timeframe)
    return _to_response(request, outcome)


def analyze_mtf(request: MtfRequest) -> MtfResponse:
    """Analyze each supplied timeframe and combine into a confluence view."""
    results: list[tuple[str, AnalysisOutcome]] = []
    for frame in request.frames:
        rows = [
            {
                "open_time": c.open_time,
                "open": c.open,
                "high": c.high,
                "low": c.low,
                "close": c.close,
                "volume": c.volume,
            }
            for c in frame.candles
        ]
        df = pd.DataFrame(rows).drop_duplicates(subset="open_time").sort_values("open_time")
        df = df.reset_index(drop=True)
        results.append((frame.timeframe, signal_engine.analyze(df, timeframe=frame.timeframe)))

    outcome = confluence.combine(request.symbol, results)
    return _mtf_response(outcome)


def analyze_smc(request: SmcRequest) -> SmcResponse:
    """Run smart-money-concepts analysis on the supplied candles."""
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
    df = pd.DataFrame(rows).drop_duplicates(subset="open_time").sort_values("open_time").reset_index(drop=True)
    result = smc_engine.analyze(df)
    return SmcResponse(
        symbol=request.symbol,
        timeframe=request.timeframe,
        structure=result.structure,
        bias=result.bias,
        last_event=asdict(result.last_event) if result.last_event else None,
        premium_discount=asdict(result.premium_discount) if result.premium_discount else None,
        order_blocks=[asdict(ob) for ob in result.order_blocks],
        fair_value_gaps=[asdict(g) for g in result.fair_value_gaps],
        liquidity=[asdict(lq) for lq in result.liquidity],
        summary=result.summary,
    )


def backtest(request: BacktestRequest) -> BacktestResponse:
    """Run a rule-based strategy backtest over the supplied candles."""
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
    df = pd.DataFrame(rows).drop_duplicates(subset="open_time").sort_values("open_time").reset_index(drop=True)
    result = backtester.run(
        df,
        strategy=request.strategy,
        params=request.params,
        initial_capital=request.initial_capital,
        commission_bps=request.commission_bps,
        timeframe=request.timeframe,
    )
    return BacktestResponse(
        symbol=request.symbol,
        timeframe=request.timeframe,
        strategy=result.strategy,
        initial_capital=result.initial_capital,
        final_equity=result.final_equity,
        metrics=asdict(result.metrics),
        trades=[asdict(t) for t in result.trades],
        equity_curve=[asdict(p) for p in result.equity_curve],
        summary=result.summary,
    )


def _mtf_response(outcome) -> MtfResponse:
    return MtfResponse(
        symbol=outcome.symbol,
        signal=outcome.signal.value,
        confidence=outcome.confidence,
        composite_score=outcome.composite_score,
        alignment=outcome.alignment,
        frames=[
            TimeframeAnalysisOut(
                timeframe=f.timeframe,
                signal=f.signal.value,
                confidence=f.confidence,
                trend=f.trend.value,
                score=f.score,
            )
            for f in outcome.frames
        ],
        summary=outcome.summary,
    )
