"""Initial Oslo Børs ticker universe used by the analyzer.

Tickers use Yahoo Finance's `.OL` suffix for Oslo Børs listings.
"""

OBX_UNIVERSE: list[dict] = [
    {"ticker": "EQNR.OL", "name": "Equinor ASA", "sector": "Energy"},
    {"ticker": "DNB.OL", "name": "DNB Bank ASA", "sector": "Financials"},
    {"ticker": "TEL.OL", "name": "Telenor ASA", "sector": "Communication Services"},
    {"ticker": "MOWI.OL", "name": "Mowi ASA", "sector": "Consumer Staples"},
    {"ticker": "NHY.OL", "name": "Norsk Hydro ASA", "sector": "Materials"},
    {"ticker": "YAR.OL", "name": "Yara International ASA", "sector": "Materials"},
    {"ticker": "AKERBP.OL", "name": "Aker BP ASA", "sector": "Energy"},
    {"ticker": "ORK.OL", "name": "Orkla ASA", "sector": "Consumer Staples"},
    {"ticker": "SUBC.OL", "name": "Subsea 7 SA", "sector": "Energy"},
    {"ticker": "STB.OL", "name": "Storebrand ASA", "sector": "Financials"},
    {"ticker": "GJF.OL", "name": "Gjensidige Forsikring ASA", "sector": "Financials"},
    {"ticker": "SALM.OL", "name": "SalMar ASA", "sector": "Consumer Staples"},
    {"ticker": "LSG.OL", "name": "Lerøy Seafood Group ASA", "sector": "Consumer Staples"},
    {"ticker": "AKSO.OL", "name": "Aker Solutions ASA", "sector": "Energy"},
    {"ticker": "KOG.OL", "name": "Kongsberg Gruppen ASA", "sector": "Industrials"},
    {"ticker": "SCATC.OL", "name": "Scatec ASA", "sector": "Utilities"},
    {"ticker": "TOM.OL", "name": "Tomra Systems ASA", "sector": "Industrials"},
    {"ticker": "AKER.OL", "name": "Aker ASA", "sector": "Industrials"},
    {"ticker": "BAKKA.OL", "name": "Bakkafrost P/F", "sector": "Consumer Staples"},
    {"ticker": "SCHA.OL", "name": "Schibsted ASA Ser. A", "sector": "Communication Services"},
]
