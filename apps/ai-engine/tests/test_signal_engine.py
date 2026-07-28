import numpy as np
import pandas as pd

from app.domain.models import SignalType, TrendDirection
from app.engines import signal_engine


def _make_df(closes: np.ndarray) -> pd.DataFrame:
    high = closes + 0.5
    low = closes - 0.5
    open_ = np.concatenate([[closes[0]], closes[:-1]])
    vol = np.full(len(closes), 1000.0)
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": closes, "volume": vol}
    )


def test_insufficient_data_is_no_trade():
    df = _make_df(np.linspace(100, 110, 10))
    out = signal_engine.analyze(df, "1d")
    assert out.signal == SignalType.NO_TRADE
    assert out.rejection


def test_strong_uptrend_is_bullish():
    closes = np.linspace(100, 200, 220)  # persistent uptrend
    out = signal_engine.analyze(_make_df(closes), "1d")
    assert out.trend == TrendDirection.UP
    assert out.signal in (SignalType.BUY, SignalType.WATCH)
    # Actionable buy must ship risk levels and explanations.
    if out.signal == SignalType.BUY:
        assert out.entry is not None and out.stop_loss is not None and out.targets
    assert out.reasons
    assert out.confidence < 100  # never guarantees an outcome


def test_strong_downtrend_is_bearish():
    closes = np.linspace(200, 100, 220)
    out = signal_engine.analyze(_make_df(closes), "1d")
    assert out.trend == TrendDirection.DOWN
    assert out.signal in (SignalType.SELL, SignalType.WATCH)


def test_choppy_flat_market_stands_aside():
    # A genuinely sideways market: oscillates around 100 with no net trend.
    x = np.linspace(0, 12 * np.pi, 220)
    closes = 100 + np.sin(x) * 1.0
    out = signal_engine.analyze(_make_df(closes), "1d")
    # No persistent trend → the engine should not issue an actionable BUY/SELL.
    assert out.signal in (SignalType.NO_TRADE, SignalType.WATCH)


def test_every_signal_has_reasons_or_rejection():
    closes = np.linspace(100, 160, 220)
    out = signal_engine.analyze(_make_df(closes), "1d")
    assert out.reasons or out.rejection
    assert out.summary
