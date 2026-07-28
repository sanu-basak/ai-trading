from fastapi import APIRouter

from app.api.v1.schemas.analysis import AnalyzeRequest, AnalyzeResponse
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
