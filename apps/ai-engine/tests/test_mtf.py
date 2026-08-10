import numpy as np
import pandas as pd

from app.api.v1.schemas.analysis import FrameIn, MtfRequest, OHLCVIn
from app.domain.models import SignalType
from app.engines import signal_engine
from app.engines.multi_timeframe import confluence
from app.services import analysis_service


def _df(closes: np.ndarray) -> pd.DataFrame:
    high = closes + 0.5
    low = closes - 0.5
    open_ = np.concatenate([[closes[0]], closes[:-1]])
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": closes, "volume": np.full(len(closes), 1000.0)}
    )


UP = _df(np.linspace(100, 200, 220))
DOWN = _df(np.linspace(200, 100, 220))


def _outcomes(pairs):
    return [(tf, signal_engine.analyze(df, tf)) for tf, df in pairs]


def test_aligned_bullish_is_buy():
    out = confluence.combine("TEST", _outcomes([("1h", UP), ("4h", UP), ("1d", UP)]))
    assert out.signal == SignalType.BUY
    assert out.alignment == "aligned_bullish"
    assert out.composite_score > 0.3
    assert len(out.frames) == 3


def test_aligned_bearish_is_sell():
    out = confluence.combine("TEST", _outcomes([("1h", DOWN), ("4h", DOWN), ("1d", DOWN)]))
    assert out.signal == SignalType.SELL
    assert out.alignment == "aligned_bearish"


def test_conflict_stands_aside():
    out = confluence.combine("TEST", _outcomes([("1h", UP), ("1d", DOWN)]))
    assert out.alignment == "mixed"
    assert out.signal in (SignalType.NO_TRADE, SignalType.WATCH)


def test_higher_timeframe_dominates():
    # 1d strongly bullish outweighs a mildly bearish 5m frame.
    mild_down = _df(np.linspace(101, 100, 220))
    out = confluence.combine("TEST", _outcomes([("5m", mild_down), ("1d", UP)]))
    assert out.composite_score > 0  # daily weight (1.8) beats 5m weight (0.7)


def test_empty_frames():
    out = confluence.combine("TEST", [])
    assert out.signal == SignalType.NO_TRADE
    assert out.confidence == 0.0


def test_service_analyze_mtf():
    def frame(tf: str, closes: np.ndarray) -> FrameIn:
        candles = [
            OHLCVIn(openTime=i * 60000, open=float(c), high=float(c) + 0.5, low=float(c) - 0.5,
                    close=float(c), volume=1000.0)
            for i, c in enumerate(closes)
        ]
        return FrameIn(timeframe=tf, candles=candles)

    req = MtfRequest(
        symbol="BTCUSDT",
        frames=[frame("1h", np.linspace(100, 200, 220)), frame("1d", np.linspace(100, 200, 220))],
    )
    res = analysis_service.analyze_mtf(req)
    assert res.symbol == "BTCUSDT"
    assert res.signal in ("BUY", "WATCH")
    assert len(res.frames) == 2
    assert res.disclaimer
