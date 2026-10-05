import json
import math
from datetime import datetime
from pathlib import Path
from django.http import FileResponse, JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET, require_POST
from .engine import plan_trip
from .providers import geocode, get_route, attach_locations, SAMPLE_PLACES, ProviderError


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@require_GET
def csrf(request):
    return JsonResponse({"token": get_token(request)})


@require_GET
def index(request):
    file = Path(__file__).resolve().parents[2] / "frontend" / "dist" / "index.html"
    if not file.exists():
        return JsonResponse({"error": "Build the frontend first: npm run build"}, status=503)
    return FileResponse(file.open("rb"), content_type="text/html")


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Send a JSON object.")
    for field in ("current", "pickup", "dropoff"):
        if not isinstance(data.get(field), str) or not 2 <= len(data[field].strip()) <= 250:
            raise ValueError(f"Provide a {field} location between 2 and 250 characters.")
    cycle = data.get("cycle_used")
    if isinstance(cycle, bool) or not isinstance(cycle, (int, float)) or not math.isfinite(cycle) or not 0 <= cycle <= 70:
        raise ValueError("Cycle hours must be a number from 0 to 70.")
    start = data.get("start", "")
    if not isinstance(start, str):
        raise ValueError("Provide a valid departure date and time.")
    try:
        date = datetime.strptime(start, "%Y-%m-%dT%H:%M")
    except ValueError as exc:
        raise ValueError("Provide a valid departure date and time.") from exc
    if not 2020 <= date.year <= 2100:
        raise ValueError("Departure year must be between 2020 and 2100.")
    for field in ("clock", "driver", "carrier", "office", "vehicle", "shipping"):
        if not isinstance(data.get(field, ""), str) or len(data.get(field, "")) > 200:
            raise ValueError(f"{field.capitalize()} must be text under 200 characters.")
    if "sample" in data and not isinstance(data["sample"], bool):
        raise ValueError("Sample must be true or false.")
    return data


@require_POST
def plan(request):
    if request.content_type != "application/json":
        return JsonResponse({"error": "Use application/json."}, status=415)
    try:
        data = validate(json.loads(request.body))
        sample = data.get("sample", False)
        places = SAMPLE_PLACES if sample else [geocode(data[k].strip()) for k in ("current", "pickup", "dropoff")]
        route = get_route(places, sample)
        result = plan_trip(route["legs"], data["cycle_used"], data["start"])
        attach_locations(result, route, places)
        result.update({"places": places, "route": route, "input": data})
        return JsonResponse(result)
    except (ValueError, TypeError, UnicodeDecodeError) as exc:
        return JsonResponse({"error": str(exc) if not isinstance(exc, json.JSONDecodeError) else "Invalid JSON."}, status=400)
    except ProviderError as exc:
        return JsonResponse({"error": str(exc)}, status=502)
