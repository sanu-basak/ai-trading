import numpy as np
import pandas as pd

from app.engines.smart_money import smc


def _from_closes(closes: list[float]) -> pd.DataFrame:
    c = np.array(closes, dtype=float)
    return pd.DataFrame(
        {
            "open": np.concatenate([[c[0]], c[:-1]]),
            "high": c + 0.5,
            "low": c - 0.5,
            "close": c,
            "volume": np.full(len(c), 1000.0),
        }
    )


def _zigzag(points: list[float], seg: int = 7) -> pd.DataFrame:
    closes: list[float] = []
    for a, b in zip(points, points[1:]):
        closes.extend(np.linspace(a, b, seg).tolist())
    return _from_closes(closes)


def test_bullish_structure_from_higher_highs_and_lows():
    # Rising zigzag: higher highs (112,124,136) and higher lows (106,118,130).
    df = _zigzag([100, 112, 106, 124, 118, 136, 130, 148])
    r = smc.analyze(df)
    assert r.structure == "bullish"


def test_bearish_structure_from_lower_highs_and_lows():
    df = _zigzag([150, 138, 144, 126, 132, 114, 120, 102])
    r = smc.analyze(df)
    assert r.structure == "bearish"


def test_bullish_fair_value_gap():
    rows = [(100, 101, 99, 100)] * 12 + [
        (100, 102, 99.5, 101),  # i-2 high = 102
        (101, 110, 101, 109),
        (112, 116, 111.5, 115),  # i low 111.5 > 102 -> bullish FVG
    ]
    df = pd.DataFrame([{"open": o, "high": h, "low": l, "close": c, "volume": 1000.0} for o, h, l, c in rows])
    gaps = smc._fair_value_gaps(df)
    assert any(g.kind == "bullish" for g in gaps)


def test_bearish_fair_value_gap():
    rows = [(100, 101, 99, 100)] * 12 + [
        (100, 101, 98, 99),  # i-2 low = 98
        (98, 98, 90, 91),
        (89, 90.5, 88, 89),  # i high 90.5 < 98 -> bearish FVG
    ]
    df = pd.DataFrame([{"open": o, "high": h, "low": l, "close": c, "volume": 1000.0} for o, h, l, c in rows])
    gaps = smc._fair_value_gaps(df)
    assert any(g.kind == "bearish" for g in gaps)


def test_premium_and_discount_zones():
    # Range 90..110; price near top -> premium, near bottom -> discount.
    base = [90, 110, 92, 108, 94, 106] * 12
    top = smc._premium_discount(_from_closes(base + [109]))
    bot = smc._premium_discount(_from_closes(base + [91]))
    assert top.zone == "premium"
    assert bot.zone == "discount"


def test_analyze_returns_summary_and_bias():
    df = _zigzag([100, 112, 106, 124, 118, 136, 130, 148])
    r = smc.analyze(df)
    assert r.summary
    assert r.bias in ("bullish", "bearish", "neutral")
    assert r.premium_discount is not None


def test_insufficient_data_is_neutral():
    df = _from_closes([100, 101, 102, 103, 104])
    r = smc.analyze(df)
    assert r.structure == "ranging"
    assert r.bias == "neutral"
