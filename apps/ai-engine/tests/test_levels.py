import numpy as np
import pandas as pd

from app.engines.price_action import levels


def _triangle_df(cycles: int = 6) -> pd.DataFrame:
    base = [90, 95, 100, 105, 110, 105, 100, 95]
    closes = np.array(base * cycles + [100], dtype=float)
    high = closes + 0.5
    low = closes - 0.5
    open_ = np.concatenate([[closes[0]], closes[:-1]])
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": closes, "volume": np.full(len(closes), 1000.0)}
    )


def test_detects_repeated_resistance_and_support():
    df = _triangle_df()
    found = levels.detect(df)
    assert found, "expected at least one level"
    # Repeated swing highs near 110.5 and lows near 89.5 should form strong levels.
    assert any(lv.kind == "resistance" and lv.strength >= 2 for lv in found)
    assert any(lv.kind == "support" and lv.strength >= 2 for lv in found)


def test_levels_sorted_by_proximity():
    df = _triangle_df()
    found = levels.detect(df)
    distances = [abs(lv.distance_pct) for lv in found]
    assert distances == sorted(distances)


def test_short_series_returns_nothing():
    df = _triangle_df(cycles=0)  # just the trailing [100]
    assert levels.detect(df) == []
