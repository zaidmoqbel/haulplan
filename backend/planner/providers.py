"""Replaceable public map adapters. No client-supplied URLs are requested."""
import bisect
import hashlib
import json
import math
import os
from pathlib import Path
import threading
import time
import requests
from django.core.cache import cache

GEOCODE_URL = os.environ.get("GEOCODE_URL", "https://nominatim.openstreetmap.org/search")
ROUTE_URL = os.environ.get("ROUTE_URL", "https://router.project-osrm.org/route/v1/driving")
HEADERS = {"User-Agent": os.environ.get("MAP_USER_AGENT", "Haulplan-Assessment/1.0 (local trip planning demo)")}
_lock = threading.Lock()
_last_geocode = 0
SAMPLE_PLACES = [
    {"name": "Chicago, Illinois, United States", "lat": 41.8781, "lon": -87.6298},
    {"name": "Indianapolis, Indiana, United States", "lat": 39.7684, "lon": -86.1581},
    {"name": "Dallas, Texas, United States", "lat": 32.7767, "lon": -96.797},
]


class ProviderError(Exception):
    pass


def get_json(url, params):
    try:
        response = requests.get(url, params=params, headers=HEADERS, timeout=(5, 35))
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise ProviderError("The map service is unavailable. Try again shortly, or load the saved example.") from exc


def geocode(query):
    global _last_geocode
    key = "geo:" + hashlib.sha256(query.casefold().encode()).hexdigest()
    with _lock:
        found = cache.get(key)
        if found:
            return found
        # Public Nominatim: explicit submissions only, <= 1 request/second.
        time.sleep(max(0, 1.1 - (time.monotonic() - _last_geocode)))
        try:
            data = get_json(GEOCODE_URL, {"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "us"})
        finally:
            _last_geocode = time.monotonic()
        if not data:
            raise ProviderError(f'No US location found for "{query}". Include city and state or a full address.')
        place = {"name": data[0]["display_name"], "lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
        cache.set(key, place, 604800)
        return place


def get_route(places, sample=False):
    if sample:
        data = json.loads((Path(__file__).parent / "sample_route.json").read_text())
        source = "Saved OSRM example · October 5, 2026"
    else:
        coords = ";".join(f'{p["lon"]},{p["lat"]}' for p in places)
        key = "route:" + hashlib.sha256(coords.encode()).hexdigest()
        data = cache.get(key)
        source = "OSRM · cached road route" if data else "OSRM · road route"
        if not data:
            data = get_json(f"{ROUTE_URL}/{coords}", {"overview": "full", "geometries": "geojson", "steps": "true"})
            if data.get("code") == "Ok":
                cache.set(key, data)
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ProviderError("No connected road route was found for these locations.")
    raw = data["routes"][0]
    if len(raw["legs"]) != 2:
        raise ProviderError("The route service did not return both trip legs.")
    legs, directions = [], []
    cumulative = 0
    for index, leg in enumerate(raw["legs"]):
        miles = leg["distance"] / 1609.344
        legs.append({"miles": miles, "minutes": math.ceil(max(leg["duration"] / 60, miles / 55 * 60))})
        for step in leg.get("steps", []):
            maneuver = step.get("maneuver", {})
            road = step.get("name") or step.get("ref") or "unnamed road"
            verb = maneuver.get("type", "continue").replace("_", " ")
            modifier = maneuver.get("modifier", "")
            directions.append({"instruction": f"{verb.capitalize()} {modifier} · {road}".replace("  ", " "),
                               "road": road, "miles": step["distance"] / 1609.344,
                               "at_mile": cumulative, "leg": index})
            cumulative += step["distance"] / 1609.344
    return {"legs": legs, "geometry": raw["geometry"]["coordinates"], "directions": directions, "source": source}


def attach_locations(result, route, places):
    coordinates = route["geometry"]
    cumulative = [0.0]
    for a, b in zip(coordinates, coordinates[1:]):
        lat1, lat2 = math.radians(a[1]), math.radians(b[1])
        h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(math.radians(b[0] - a[0]) / 2) ** 2
        cumulative.append(cumulative[-1] + 3958.8 * 2 * math.asin(min(1, math.sqrt(h))))
    total = result["summary"]["miles"]

    def location(mile):
        target = mile / total * cumulative[-1] if total else 0
        i = min(max(1, bisect.bisect_left(cumulative, target)), len(coordinates) - 1)
        span = cumulative[i] - cumulative[i - 1]
        fraction = (target - cumulative[i - 1]) / span if span else 0
        a, b = coordinates[i - 1], coordinates[i]
        return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction]

    def enrich(e):
        mile = e["mile_start"]
        coord = location(mile)
        if abs(mile) < .01:
            label = places[0]["name"]
            coord = [places[0]["lon"], places[0]["lat"]]
        elif abs(mile - route["legs"][0]["miles"]) < .01:
            label = places[1]["name"]
            coord = [places[1]["lon"], places[1]["lat"]]
        elif abs(mile - total) < .01:
            label = places[2]["name"]
            coord = [places[2]["lon"], places[2]["lat"]]
        else:
            roads = [d for d in route["directions"] if d["at_mile"] <= mile]
            road = roads[-1]["road"] if roads else "route"
            label = f"Near {road} · route mile {mile:.0f} (estimated)"
        e.update({"location": label, "coordinate": coord})
    for e in result["events"]:
        enrich(e)
    for day in result["days"]:
        for e in day["segments"]:
            enrich(e)
