#!/usr/bin/env python3
"""
langgraph_geolocator.py — LLM-powered geoparser (OpenAI **or** Ollama)

 Backend selection
 -----------------
 • OpenAI (default) …  export OPENAI_API_KEY=sk-…
 • Ollama local model  …  export LLMODEL=ollama:llama3:8b
                          [optional] OLLAMA_HOST=http://127.0.0.1:11434

 Always set Mapbox
 -----------------
 export MAPBOX_ACCESS_TOKEN=pk-…

 Tested on:
   langgraph 0.0.26, pydantic 2.x, openai 1.x, ollama-py ≥ 0.2.0
"""

from __future__ import annotations
import os, re, json, math, logging, requests, textwrap
from dataclasses import dataclass, field
from functools   import lru_cache
from typing      import List, Optional

from pydantic import BaseModel, Field
try:
    from langgraph.graph import StateGraph as Graph          # stable wheel
except ImportError:                                          # nightly/edge
    from langgraph.graph import Graph

import pycountry                                             # ISO lookup
from openai import OpenAI                                    # OpenAI SDK

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("llm_geolocator")

# ───────────────────────────── helpers ─────────────────────────────────────
@lru_cache(maxsize=None)
def iso2(name: str) -> Optional[str]:
    """Return ISO-2 (alpha-2) for a country name; None if unknown."""
    try:    return pycountry.countries.lookup(name).alpha_2
    except LookupError: return None

# ──────────────────────── data structures ──────────────────────────────────
@dataclass
class LocationEntity:
    name: str
    type: str
    confidence: float
    context: str

@dataclass
class GeolocationResult:
    lat: Optional[float] = None
    lon: Optional[float] = None
    country_code: Optional[str] = None
    confidence: float = 0.0
    source: str = "llm"
    place_name: Optional[str] = None
    geocoding_attempts: List[str] = field(default_factory=list)

class GeoState(BaseModel):
    text:    str
    entities: List[LocationEntity]   = Field(default_factory=list)
    results:  List[GeolocationResult] = Field(default_factory=list)

# ───────────────────────── Mapbox helper ───────────────────────────────────
class MapboxGeocoder:
    def __init__(self, token: str):
        self.token = token
        self.base  = "https://api.mapbox.com/geocoding/v5/mapbox.places"

    def geocode(self, query: str, cc: Optional[str] = None) -> Optional[dict]:
        params = {"access_token": self.token, "limit": 1,
                  "types": "country,region,place,locality,neighborhood,poi"}
        if cc: params["country"] = cc.lower()
        try:
            r = requests.get(f"{self.base}/{query}.json", params=params, timeout=10)
            if r.status_code == 422 and params.get("country"):
                params.pop("country")                      # bad ISO -> retry
                r = requests.get(f"{self.base}/{query}.json", params=params, timeout=10)
            r.raise_for_status()
            feats = r.json().get("features") or []
            if feats:
                lon, lat = feats[0]["geometry"]["coordinates"]
                return {"lat": lat, "lon": lon,
                        "place_name": feats[0].get("place_name", query),
                        "relevance": feats[0].get("relevance", 1.0)}
        except Exception as e:
            log.warning(f"Mapbox geocode fail for '{query}': {e}")
        return None

# ───────────────────────── LLM extractors ──────────────────────────────────
class OpenAIExtractor:
    def __init__(self, key: str): self.cli = OpenAI(api_key=key)
    def extract(self, txt: str) -> List[LocationEntity]:
        prompt = ("You are a precise location-extraction engine. "
                  "Return JSON array of {name,type,confidence,context}. "
                  f"Message: {json.dumps(txt)}")
        try:
            msg = (self.cli.chat.completions.create(
                      model="gpt-4o-mini", temperature=0,
                      messages=[{"role": "user", "content": prompt}],
                      max_tokens=500)
                   .choices[0].message.content.strip())
            if msg.startswith("```"):                       # strip ```json
                msg = re.sub(r"```json|```", "", msg).strip()
            data = json.loads(msg)
            return [LocationEntity(**{**d, "confidence": float(d.get("confidence", 0))})
                    for d in data]
        except Exception as e:
            log.error(f"OpenAI extraction failed: {e}")
            return []

class OllamaExtractor:
    def __init__(self, model: str, host: str):
        import ollama                                      # local import
        self.model = model
        self.cli   = ollama.Client(host=host)

    def extract(self, txt: str) -> List[LocationEntity]:
        prompt = ("You are a precise location-extraction engine. "
                  "Return JSON array of {name,type,confidence,context}. "
                  f"Message: {json.dumps(txt)}")
        try:
            rsp = self.cli.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": 0}                  # ← NEW API
            )
            msg = rsp["message"]["content"].strip()
            if msg.startswith("```"):
                msg = re.sub(r"```json|```", "", msg).strip()
            data = json.loads(msg)
            return [LocationEntity(**{**d, "confidence": float(d.get("confidence", 0))})
                    for d in data]
        except Exception as e:
            log.error(f"Ollama extraction failed: {e}")
            return []

# ───────────────────────── choose backend ──────────────────────────────────
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
LLMODEL    = os.getenv("LLMODEL", "")            # e.g. ollama:llama3:8b
MAPBOX_KEY = os.getenv("MAPBOX_ACCESS_TOKEN", "")

if LLMODEL.lower().startswith("ollama"):
    model_name = LLMODEL.split(":", 1)[-1] or "llama3:8b"
    host       = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    _llm = OllamaExtractor(model_name, host)
else:
    _llm = OpenAIExtractor(OPENAI_KEY)

_map = MapboxGeocoder(MAPBOX_KEY)

# ───────────────────── centroids / overrides (short) ───────────────────────
COUNTRY_CENTROIDS = {"taiwan": (23.6978, 120.9605),
                     "syria" : (34.8021,  38.9968)}
LOCATION_OVERRIDES = {"gaza": (31.5017, 34.4668),
                      "kharkiv": (49.9935, 36.2304)}

# ───────────────────────── graph nodes ─────────────────────────────────────
def clean_node(s: GeoState) -> GeoState:
    return GeoState(text=s.text.replace("\n", " ").strip())

def extract_node(s: GeoState) -> GeoState:
    return s.model_copy(update={"entities": _llm.extract(s.text)})

def hint_node(s: GeoState) -> GeoState:
    hint = next((t.lower() for t in re.findall(r"\b[A-Z][a-z]{2,}\b", s.text)
                 if t.lower() in COUNTRY_CENTROIDS), None)
    ents = []
    for e in s.entities:
        ctx = f"hint_country:{hint}" if hint and e.type != "country" else e.context
        ents.append(LocationEntity(**{**e.__dict__, "context": ctx}))
    return s.model_copy(update={"entities": ents})

def geocode_node(s: GeoState) -> GeoState:
    res_list: List[GeolocationResult] = []
    for e in s.entities:
        key = e.name.lower()
        res = GeolocationResult()
        res.geocoding_attempts.append(f"LLM entity: {e.name}")

        hint_match = re.search(r"hint_country:([a-z ]+)", e.context or "")
        cc = iso2(hint_match.group(1)) if hint_match else None

        if key in LOCATION_OVERRIDES:                                  # 1) override
            res.lat, res.lon = LOCATION_OVERRIDES[key]
            res.place_name, res.confidence, res.source = e.name, e.confidence, "override"
        elif e.type == "country" and key in COUNTRY_CENTROIDS:         # 2) centroid
            res.lat, res.lon = COUNTRY_CENTROIDS[key]
            res.place_name, res.confidence, res.source = e.name, e.confidence, "centroid"
        else:                                                          # 3) Mapbox
            g = _map.geocode(e.name, cc)
            if g:
                res.lat, res.lon = g["lat"], g["lon"]
                res.place_name   = g["place_name"]
                res.confidence   = e.confidence * g["relevance"]
                res.source       = "mapbox"
            else:
                res.confidence = 0
        res_list.append(res)
    return s.model_copy(update={"results": res_list})

def validate_node(s: GeoState) -> GeoState:
    ok = [r for r in s.results if r.confidence >= .2 and r.lat]
    if len(ok) <= 1:
        return s.model_copy(update={"results": ok})

    best = max(ok, key=lambda r: r.confidence)
    keep = [best]
    for r in ok:
        if r is best or r.source == "override":
            keep.append(r); continue
        φ1, λ1, φ2, λ2 = map(math.radians, [best.lat, best.lon, r.lat, r.lon])
        d = 6371 * 2 * math.asin(math.sqrt(
              math.sin((φ2-φ1)/2)**2
              + math.cos(φ1)*math.cos(φ2)*math.sin((λ2-λ1)/2)**2))
        if d <= 400:
            keep.append(r)
    return s.model_copy(update={"results": keep})

def output_node(s: GeoState) -> dict:
    return {"results": s.results}

# ───────────────────── assemble & compile graph ────────────────────────────
g = Graph(state_schema=GeoState)
for name, fn in [("clean", clean_node), ("extract", extract_node),
                 ("hint", hint_node),  ("geocode", geocode_node),
                 ("validate", validate_node), ("output", output_node)]:
    g.add_node(name, fn)

g.add_edge("clean", "extract"); g.add_edge("extract", "hint")
g.add_edge("hint", "geocode"); g.add_edge("geocode", "validate")
g.add_edge("validate", "output"); g.set_entry_point("clean")
geo_pipeline = g.compile()

# ────────────────────────────── CLI ────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if not MAPBOX_KEY:
        log.error("MAPBOX_ACCESS_TOKEN missing"); sys.exit(1)
    if not LLMODEL and not OPENAI_KEY:
        log.error("Set OPENAI_API_KEY or LLMODEL=ollama:…"); sys.exit(1)
    if len(sys.argv) < 2:
        print("Usage: python langgraph_geolocator.py 'some text'"); sys.exit(0)

    state = GeoState(text=" ".join(sys.argv[1:]))
    out   = geo_pipeline.invoke(state)["results"]            # ← NEW API
    print(textwrap.indent(json.dumps([r.__dict__ for r in out],
                                     indent=2, ensure_ascii=False), "  "))