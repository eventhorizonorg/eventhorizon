#!/usr/bin/env python3
"""
langgraph_geolocator.py  –  LLM-powered geoparser (OpenAI **or** Ollama)

Set ONE of the two vars below before running:

  export OPENAI_API_KEY=sk-…            # ← use OpenAI (default)
  ──or──
  export LLMODEL=ollama:llama3:8b       # ← use local Ollama model

Always set your Mapbox token:

  export MAPBOX_ACCESS_TOKEN=pk.…
"""

from __future__ import annotations
import os, re, json, math, logging, requests
from dataclasses import dataclass, field
from typing import List, Optional
from functools import lru_cache

# ── third-party deps ──────────────────────────────────────────────
from pydantic import BaseModel, Field
try:
    from langgraph.graph import StateGraph as Graph  # stable wheel
except ImportError:
    from langgraph.graph import Graph                # edge
import pycountry                                      # iso lookup
from openai import OpenAI
try:
    import ollama                                    # optional
except ModuleNotFoundError:
    ollama = None

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("llm_geolocator")

# ── small helpers ────────────────────────────────────────────────
@lru_cache(maxsize=None)
def iso2(name: str) -> Optional[str]:
    """Return ISO-2 for a country name or None if unknown."""
    try:
        return pycountry.countries.lookup(name).alpha_2
    except LookupError:
        return None

# ── dataclasses / state ──────────────────────────────────────────
@dataclass
class LocationEntity:
    name: str; type: str; confidence: float; context: str

@dataclass
class GeolocationResult:
    lat: Optional[float]=None; lon: Optional[float]=None
    country_code: Optional[str]=None; confidence: float=0.0
    source: str="llm"; place_name: Optional[str]=None
    geocoding_attempts: List[str]=field(default_factory=list)

class GeoState(BaseModel):
    text: str
    entities: List[LocationEntity]=Field(default_factory=list)
    results : List[GeolocationResult]=Field(default_factory=list)

# ── Mapbox geocoder (now retries if hint is bad) ─────────────────
class MapboxGeocoder:
    def __init__(self, token: str):
        self.token = token
        self.base  = "https://api.mapbox.com/geocoding/v5/mapbox.places"
    def geocode(self, query: str, cc: Optional[str]=None) -> Optional[dict]:
        params = {"access_token": self.token, "limit":1,
                  "types":"country,region,place,locality,neighborhood,poi"}
        if cc: params["country"] = cc.lower()
        try:
            r = requests.get(f"{self.base}/{query}.json", params=params, timeout=10)
            if r.status_code == 422 and params.get("country"):
                # retry without the dud ISO
                params.pop("country"); r = requests.get(f"{self.base}/{query}.json", params=params, timeout=10)
            r.raise_for_status()
            feats = r.json().get("features") or []
            if feats:
                lon,lat=feats[0]["geometry"]["coordinates"]
                return {"lat":lat,"lon":lon,"place_name":feats[0].get("place_name",query),
                        "relevance":feats[0].get("relevance",1.0)}
        except Exception as e:
            log.warning(f"Mapbox geocode fail for '{query}': {e}")
        return None

# ── LLM extractors (OpenAI & Ollama) ─────────────────────────────
class OpenAIExtractor:
    def __init__(self,key:str): self.cli=OpenAI(api_key=key)
    def extract(self,txt:str)->List[LocationEntity]:
        prompt=("You are a precise location-extraction engine. Return JSON list "
                "of {name,type,confidence,context}. Message: "+json.dumps(txt))
        try:
            msg=self.cli.chat.completions.create(model="gpt-4o-mini",temperature=0,
                  messages=[{"role":"user","content":prompt}],max_tokens=500
            ).choices[0].message.content.strip()
            if msg.startswith("```"): msg=re.sub(r"```json|```","",msg).strip()
            data=json.loads(msg)
            return [LocationEntity(**{**d,"confidence":float(d.get("confidence",0))}) for d in data]
        except Exception as e: log.error(f"OpenAI extraction failed: {e}"); return []

class OllamaExtractor:
    def __init__(self,model:str="llama3:8b"): self.model=model
    def extract(self,txt:str)->List[LocationEntity]:
        prompt=("You are a precise location-extraction engine. Return JSON list "
                "of {name,type,confidence,context}. Message: "+json.dumps(txt))
        try:
            rsp=ollama.chat(model=self.model,messages=[{"role":"user","content":prompt}],temperature=0)
            msg=rsp["message"]["content"].strip()
            if msg.startswith("```"): msg=re.sub(r"```json|```","",msg).strip()
            data=json.loads(msg)
            return [LocationEntity(**{**d,"confidence":float(d.get("confidence",0))}) for d in data]
        except Exception as e: log.error(f"Ollama extraction failed: {e}"); return []

# ── choose backend ───────────────────────────────────────────────
OPENAI_KEY=os.getenv("OPENAI_API_KEY","")
LLMODEL =  os.getenv("LLMODEL","")        # e.g. "ollama:llama3:8b"
if LLMODEL.lower().startswith("ollama"):
    if not ollama: raise ImportError("pip install ollama")
    _llm = OllamaExtractor( LLMODEL.split(":",1)[-1] )
else:
    _llm = OpenAIExtractor(OPENAI_KEY)

MAPBOX=_map = MapboxGeocoder(os.getenv("MAPBOX_ACCESS_TOKEN",""))

# ── overrides / centroids (trimmed for brevity) ──────────────────
COUNTRY_CENTROIDS={"taiwan":(23.6978,120.9605),"syria":(34.8021,38.9968)}
LOCATION_OVERRIDES={"gaza":(31.5017,34.4668),"kharkiv":(49.9935,36.2304)}

# ---------- graph nodes (clean → extract → …) --------------------
def clean_node(s:GeoState)->GeoState:
    return GeoState(text=s.text.replace("\n"," ").strip())

def extract_node(s:GeoState)->GeoState:
    return s.copy(update={"entities":_llm.extract(s.text)})

def hint_node(s:GeoState)->GeoState:
    hint=None
    for t in re.findall(r"\b[A-Z][a-z]{2,}\b",s.text):
        if t.lower() in COUNTRY_CENTROIDS: hint=t.lower(); break
    ent=[]
    for e in s.entities:
        if hint and e.type!="country": e.context=f"hint_country:{hint}"
        ent.append(e)
    return s.copy(update={"entities":ent})

def geocode_node(s:GeoState)->GeoState:
    results=[]
    for e in s.entities:
        key=e.name.lower(); res=GeolocationResult()
        res.geocoding_attempts.append(f"LLM entity: {e.name}")
        hint_match=re.search(r"hint_country:([a-z ]+)",e.context); cc=None
        if hint_match: cc=iso2(hint_match.group(1))
        # overrides
        if key in LOCATION_OVERRIDES:
            lat,lon=LOCATION_OVERRIDES[key]; res.lat,res.lon=lat,lon
            res.place_name=e.name; res.confidence=e.confidence; res.source="override"
            results.append(res); continue
        if e.type=="country" and key in COUNTRY_CENTROIDS:
            lat,lon=COUNTRY_CENTROIDS[key]; res.lat,res.lon=lat,lon
            res.place_name=e.name; res.confidence=e.confidence; res.source="centroid"
            results.append(res); continue
        g=_map.geocode(e.name,cc)
        if g:
            res.lat,res.lon=g["lat"],g["lon"]; res.place_name=g["place_name"]
            res.confidence=e.confidence*g["relevance"]; res.source="mapbox"
        else: res.confidence=0
        results.append(res)
    return s.copy(update={"results":results})

def validate_node(s:GeoState)->GeoState:
    ok=[r for r in s.results if r.confidence>=0.2 and r.lat]
    if len(ok)<=1: return s.copy(update={"results":ok})
    best=max(ok,key=lambda r:r.confidence); keep=[best]
    for r in ok:
        if r is best or r.source=="override": keep.append(r); continue
        # haversine
        dlat,dlon=map(math.radians,[r.lat-best.lat,r.lon-best.lon])
        a=math.sin(dlat/2)**2+math.cos(math.radians(best.lat))*math.cos(math.radians(r.lat))*math.sin(dlon/2)**2
        if 6371*2*math.asin(math.sqrt(a))<=400: keep.append(r)
    return s.copy(update={"results":keep})

def output_node(s:GeoState)->dict: return {"results":s.results}

# ---------- build graph ------------------------------------------
g=Graph(state_schema=GeoState)
for n,f in [("clean",clean_node),("extract",extract_node),("hint",hint_node),
            ("geocode",geocode_node),("validate",validate_node),("output",output_node)]:
    g.add_node(n,f)
g.add_edge("clean","extract"); g.add_edge("extract","hint")
g.add_edge("hint","geocode"); g.add_edge("geocode","validate")
g.add_edge("validate","output"); g.set_entry_point("clean")
geo_pipeline=g.compile()

# ---------- CLI ---------------------------------------------------
if __name__=="__main__":
    import sys, textwrap
    if not os.getenv("MAPBOX_ACCESS_TOKEN"):
        log.error("Need MAPBOX_ACCESS_TOKEN"); sys.exit(1)
    if not LLMODEL and not OPENAI_KEY:
        log.error("Need OPENAI_API_KEY or LLMODEL=ollama:…"); sys.exit(1)
    if len(sys.argv)<2:
        print("Usage: python langgraph_geolocator.py 'some text'"); sys.exit(0)
    out=geo_pipeline.run(GeoState(text=" ".join(sys.argv[1:])))
    print(textwrap.indent(json.dumps([r.__dict__ for r in out["results"]],indent=2,ensure_ascii=False),"  "))