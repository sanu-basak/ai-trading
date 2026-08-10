from fastapi import APIRouter

from app.api.v1.schemas.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    MtfRequest,
    MtfResponse,
)
from app.services import analysis_service

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """Run a full technical analysis over the supplied candles.

    The caller (the Node API) provides real OHLCV candles fetched from its
    market-data providers. This service performs only analysis on that data and
    returns an explainable BUY / SELL / NO_TRADE / WATCH recommendation.
    """
    return analysis_service.analyze(request)


@router.post("/analyze-mtf", response_model=MtfResponse)
def analyze_mtf(request: MtfRequest) -> MtfResponse:
    """Multi-timeframe confluence: analyze several timeframes of the same
    instrument and combine them into one composite call, weighting higher
    timeframes more and flagging agreement vs conflict."""
    return analysis_service.analyze_mtf(request)
