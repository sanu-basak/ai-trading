import pandas as pd

from app.engines.patterns import candlestick


def _df(rows: list[tuple[float, float, float, float]]) -> pd.DataFrame:
    return pd.DataFrame(
        [{"open": o, "high": h, "low": l, "close": c, "volume": 1000.0} for o, h, l, c in rows]
    )


def _names(df: pd.DataFrame) -> set[str]:
    return {p.name for p in candlestick.detect(df)}


def test_bullish_engulfing():
    # ...neutral, prior down candle, then an up candle that engulfs it.
    df = _df([
        (100, 101, 99, 100),
        (105, 106, 99, 100),   # bearish
        (99, 107, 98, 106),    # bullish, engulfs prior body
    ])
    detected = candlestick.detect(df)
    names = {p.name for p in detected}
    assert "bullish_engulfing" in names
    assert any(p.direction == "bullish" for p in detected if p.name == "bullish_engulfing")


def test_bearish_engulfing():
    df = _df([
        (100, 101, 99, 100),
        (100, 106, 99, 105),   # bullish
        (106, 107, 98, 99),    # bearish, engulfs prior body
    ])
    assert "bearish_engulfing" in _names(df)


def test_hammer():
    # Moderate body near the top with a long lower shadow (~3x the body).
    df = _df([
        (100, 101, 99, 100),
        (100, 101, 99, 100),
        (100, 101.2, 97, 101),  # body 1.0, lower shadow 3.0, upper shadow 0.2
    ])
    assert "hammer" in _names(df)


def test_doji():
    df = _df([
        (100, 101, 99, 100.5),
        (100, 101, 99, 100.3),
        (100, 103, 97, 100.02),  # open ~ close, wide range
    ])
    assert "doji" in _names(df)


def test_three_white_soldiers():
    df = _df([
        (100, 100.6, 99.8, 100.5),  # bullish
        (100.6, 101.6, 100.5, 101.5),  # bullish, higher close
        (101.6, 102.6, 101.5, 102.5),  # bullish, higher close
    ])
    assert "three_white_soldiers" in _names(df)


def test_no_false_positive_on_flat_series():
    df = _df([(100, 100.2, 99.8, 100)] * 6)
    # A flat series should not yield strong directional reversals like engulfings.
    names = _names(df)
    assert "bullish_engulfing" not in names
    assert "bearish_engulfing" not in names
