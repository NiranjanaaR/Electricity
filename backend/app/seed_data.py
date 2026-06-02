"""Oslo Børs ticker universe.

Tickers use Yahoo Finance's ``.OL`` suffix for Oslo Børs listings. Covers the
OBX25 plus a broader liquid set across sectors (~80 companies). Tickers can
be added/removed without code changes by editing this file — the analyzer
picks them up on the next run.
"""

OBX_UNIVERSE: list[dict] = [
    # Energy / Oil & Gas
    {"ticker": "EQNR.OL",   "name": "Equinor ASA",                       "sector": "Energy"},
    {"ticker": "AKERBP.OL", "name": "Aker BP ASA",                       "sector": "Energy"},
    {"ticker": "VAR.OL",    "name": "Vår Energi ASA",                    "sector": "Energy"},
    {"ticker": "BWLPG.OL",  "name": "BW LPG Limited",                    "sector": "Energy"},
    {"ticker": "DNO.OL",    "name": "DNO ASA",                           "sector": "Energy"},
    {"ticker": "PGS.OL",    "name": "PGS ASA",                           "sector": "Energy"},
    {"ticker": "TGS.OL",    "name": "TGS ASA",                           "sector": "Energy"},
    {"ticker": "SUBC.OL",   "name": "Subsea 7 SA",                       "sector": "Energy"},
    {"ticker": "AKSO.OL",   "name": "Aker Solutions ASA",                "sector": "Energy"},
    {"ticker": "BORR.OL",   "name": "Borr Drilling Limited",             "sector": "Energy"},
    {"ticker": "ODL.OL",    "name": "Odfjell Drilling Ltd.",             "sector": "Energy"},
    {"ticker": "SDRL.OL",   "name": "Seadrill Limited",                  "sector": "Energy"},
    {"ticker": "OET.OL",    "name": "Okeanis Eco Tankers Corp.",         "sector": "Energy"},

    # Financials
    {"ticker": "DNB.OL",    "name": "DNB Bank ASA",                      "sector": "Financials"},
    {"ticker": "STB.OL",    "name": "Storebrand ASA",                    "sector": "Financials"},
    {"ticker": "GJF.OL",    "name": "Gjensidige Forsikring ASA",         "sector": "Financials"},
    {"ticker": "NONG.OL",   "name": "SpareBank 1 Nord-Norge",            "sector": "Financials"},
    {"ticker": "MING.OL",   "name": "SpareBank 1 SMN",                   "sector": "Financials"},
    {"ticker": "SRBNK.OL",  "name": "SpareBank 1 SR-Bank",               "sector": "Financials"},
    {"ticker": "PROT.OL",   "name": "Protector Forsikring ASA",          "sector": "Financials"},
    {"ticker": "B2H.OL",    "name": "B2 Impact ASA",                     "sector": "Financials"},

    # Communication Services
    {"ticker": "TEL.OL",    "name": "Telenor ASA",                       "sector": "Communication Services"},
    {"ticker": "SCHA.OL",   "name": "Schibsted ASA Ser. A",              "sector": "Communication Services"},
    {"ticker": "SCHB.OL",   "name": "Schibsted ASA Ser. B",              "sector": "Communication Services"},
    {"ticker": "ADE.OL",    "name": "Adevinta ASA",                      "sector": "Communication Services"},

    # Consumer Staples / Seafood / Food
    {"ticker": "MOWI.OL",   "name": "Mowi ASA",                          "sector": "Consumer Staples"},
    {"ticker": "SALM.OL",   "name": "SalMar ASA",                        "sector": "Consumer Staples"},
    {"ticker": "LSG.OL",    "name": "Lerøy Seafood Group ASA",           "sector": "Consumer Staples"},
    {"ticker": "BAKKA.OL",  "name": "Bakkafrost P/F",                    "sector": "Consumer Staples"},
    {"ticker": "GSF.OL",    "name": "Grieg Seafood ASA",                 "sector": "Consumer Staples"},
    {"ticker": "AUSS.OL",   "name": "Austevoll Seafood ASA",             "sector": "Consumer Staples"},
    {"ticker": "ORK.OL",    "name": "Orkla ASA",                         "sector": "Consumer Staples"},

    # Materials
    {"ticker": "NHY.OL",    "name": "Norsk Hydro ASA",                   "sector": "Materials"},
    {"ticker": "YAR.OL",    "name": "Yara International ASA",            "sector": "Materials"},
    {"ticker": "ELK.OL",    "name": "Elkem ASA",                         "sector": "Materials"},
    {"ticker": "BRG.OL",    "name": "Borregaard ASA",                    "sector": "Materials"},

    # Industrials
    {"ticker": "KOG.OL",    "name": "Kongsberg Gruppen ASA",             "sector": "Industrials"},
    {"ticker": "TOM.OL",    "name": "Tomra Systems ASA",                 "sector": "Industrials"},
    {"ticker": "AKER.OL",   "name": "Aker ASA",                          "sector": "Industrials"},
    {"ticker": "VEI.OL",    "name": "Veidekke ASA",                      "sector": "Industrials"},
    {"ticker": "AFG.OL",    "name": "AF Gruppen ASA",                    "sector": "Industrials"},
    {"ticker": "MULTI.OL",  "name": "Multiconsult ASA",                  "sector": "Industrials"},
    {"ticker": "BOUV.OL",   "name": "Bouvet ASA",                        "sector": "Industrials"},

    # Shipping / Transport
    {"ticker": "FRO.OL",    "name": "Frontline plc",                     "sector": "Shipping"},
    {"ticker": "GOGL.OL",   "name": "Golden Ocean Group Limited",        "sector": "Shipping"},
    {"ticker": "MPCC.OL",   "name": "MPC Container Ships ASA",           "sector": "Shipping"},
    {"ticker": "BELCO.OL",  "name": "Belships ASA",                      "sector": "Shipping"},
    {"ticker": "JIN.OL",    "name": "Jinhui Shipping and Transportation","sector": "Shipping"},
    {"ticker": "WAWI.OL",   "name": "Wallenius Wilhelmsen ASA",          "sector": "Shipping"},
    {"ticker": "HAFNI.OL",  "name": "Hafnia Limited",                    "sector": "Shipping"},
    {"ticker": "SNI.OL",    "name": "Stolt-Nielsen Limited",             "sector": "Shipping"},

    # Real Estate
    {"ticker": "ENTRA.OL",  "name": "Entra ASA",                         "sector": "Real Estate"},
    {"ticker": "OLT.OL",    "name": "Olav Thon Eiendomsselskap ASA",     "sector": "Real Estate"},
    {"ticker": "SBO.OL",    "name": "Selvaag Bolig ASA",                 "sector": "Real Estate"},

    # Utilities / Renewables
    {"ticker": "SCATC.OL",  "name": "Scatec ASA",                        "sector": "Utilities"},
    {"ticker": "AKH.OL",    "name": "Aker Horizons ASA",                 "sector": "Utilities"},
    {"ticker": "NEL.OL",    "name": "NEL ASA",                           "sector": "Utilities"},

    # Information Technology / Software
    {"ticker": "CRAYN.OL",  "name": "Crayon Group Holding ASA",          "sector": "Information Technology"},
    {"ticker": "ATEA.OL",   "name": "Atea ASA",                          "sector": "Information Technology"},
    {"ticker": "NOD.OL",    "name": "Nordic Semiconductor ASA",          "sector": "Information Technology"},
    {"ticker": "KAHOT.OL",  "name": "Kahoot! ASA",                       "sector": "Information Technology"},
    {"ticker": "AUTO.OL",   "name": "Autostore Holdings Ltd",            "sector": "Information Technology"},
    {"ticker": "NAS.OL",    "name": "Norwegian Air Shuttle ASA",         "sector": "Industrials"},

    # Healthcare / Biotech
    {"ticker": "MEDI.OL",   "name": "Medistim ASA",                      "sector": "Health Care"},
    {"ticker": "PHO.OL",    "name": "Photocure ASA",                     "sector": "Health Care"},
    {"ticker": "NANOV.OL",  "name": "Nordic Nanovector ASA",             "sector": "Health Care"},
    {"ticker": "PCIB.OL",   "name": "PCI Biotech Holding ASA",           "sector": "Health Care"},
    {"ticker": "BGBIO.OL",  "name": "BerGenBio ASA",                     "sector": "Health Care"},
    {"ticker": "OTOVO.OL",  "name": "Otovo ASA",                         "sector": "Utilities"},
    {"ticker": "ULTI.OL",   "name": "Ultimovacs ASA",                    "sector": "Health Care"},

    # Consumer Discretionary / Retail
    {"ticker": "EPR.OL",    "name": "Europris ASA",                      "sector": "Consumer Discretionary"},
    {"ticker": "XXL.OL",    "name": "XXL ASA",                           "sector": "Consumer Discretionary"},
    {"ticker": "KID.OL",    "name": "Kid ASA",                           "sector": "Consumer Discretionary"},
    {"ticker": "RECSI.OL",  "name": "REC Silicon ASA",                   "sector": "Information Technology"},
]


def universe() -> list[dict]:
    """Deduplicate the universe on ticker."""
    seen: set[str] = set()
    out: list[dict] = []
    for entry in OBX_UNIVERSE:
        t = entry["ticker"].upper()
        if t in seen:
            continue
        seen.add(t)
        out.append({**entry, "ticker": t})
    return out
