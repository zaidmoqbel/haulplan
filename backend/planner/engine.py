"""Conservative property-carrier planning; all scheduling arithmetic uses minutes."""
from datetime import datetime, timedelta
import math

STATUSES = ("off_duty", "sleeper", "driving", "on_duty")


def plan_trip(legs, cycle_used, start):
    if not isinstance(cycle_used, (int, float)) or not math.isfinite(cycle_used) or not 0 <= cycle_used <= 70:
        raise ValueError("Cycle hours must be between 0 and 70.")
    departure = datetime.strptime(start, "%Y-%m-%dT%H:%M")
    base = departure.replace(hour=0, minute=0)
    now = departure.hour * 60 + departure.minute
    begun = now
    cycle = math.ceil(cycle_used * 60)
    driven = since_break = 0
    shift_start = None
    distance = since_fuel = 0.0
    events = []

    def emit(minutes, status, kind, label, leg, miles=0):
        nonlocal now, cycle, driven, since_break, shift_start, distance, since_fuel
        if status in ("driving", "on_duty"):
            if shift_start is None:
                shift_start = now
            cycle += minutes
        if status == "driving":
            driven += minutes
            since_break += minutes
            since_fuel += miles
        elif minutes >= 30:
            since_break = 0
        events.append({"start": now, "end": now + minutes, "status": status,
                       "kind": kind, "label": label, "leg": leg, "miles": miles,
                       "mile_start": distance, "mile_end": distance + miles,
                       "cycle_remaining": max(0, 4200 - cycle)})
        distance += miles
        now += minutes

    def rest(leg, restart=False):
        nonlocal driven, since_break, shift_start, cycle
        emit(2040 if restart else 600, "off_duty", "restart" if restart else "rest",
             "34-hour cycle restart" if restart else "10-hour daily rest", leg)
        driven = since_break = 0
        shift_start = None
        if restart:
            cycle = 0
        events[-1]["cycle_remaining"] = 4200 - cycle

    def work(minutes, kind, label, leg):
        if cycle + minutes > 4200:
            rest(leg, True)
        emit(minutes, "on_duty", kind, label, leg)

    if len(legs) != 2:
        raise ValueError("Exactly two route legs are required.")
    for index, leg in enumerate(legs):
        miles, minutes = float(leg["miles"]), math.ceil(leg["minutes"])
        if not math.isfinite(miles) or miles < 0 or minutes < 0 or miles > 15000:
            raise ValueError("Invalid route distance or duration.")
        if miles > 0 and minutes <= 0:
            raise ValueError("A moving leg needs positive duration.")
        remaining = minutes if miles > 0 else 0
        rate = miles / remaining if remaining else 0
        while remaining > 0:
            if cycle >= 4200:
                rest(index, True)
                continue
            if driven >= 660 or (shift_start is not None and now - shift_start >= 840):
                rest(index)
                continue
            # Fuel slightly early if the next whole minute would cross 1,000 mi.
            fuel_capacity = math.floor((1000 - since_fuel + 1e-8) / rate)
            if fuel_capacity <= 0:
                work(30, "fuel", "Fuel stop · 30 minutes", index)
                since_fuel = 0
                continue
            if since_break >= 480:
                emit(30, "off_duty", "break", "30-minute driving break", index)
                continue
            window = 840 if shift_start is None else 840 - (now - shift_start)
            chunk = min(remaining, 660 - driven, 480 - since_break, 4200 - cycle, window, fuel_capacity)
            emit(chunk, "driving", "drive", "Drive to pickup" if index == 0 else "Drive to delivery", index, chunk * rate)
            remaining -= chunk
        work(60, "pickup" if index == 0 else "dropoff", "Pickup · loading" if index == 0 else "Delivery · unloading", index)

    days = []
    for day_index in range((now - 1) // 1440 + 1):
        lower, upper = day_index * 1440, (day_index + 1) * 1440
        segments, cursor = [], lower
        for event in events:
            a, b = max(lower, event["start"]), min(upper, event["end"])
            if a >= b:
                continue
            if cursor < a:
                segments.append({"start": cursor - lower, "end": a - lower, "status": "off_duty", "label": "Assumed off duty before departure", "miles": 0, "kind": "padding", "mile_start": 0, "mile_end": 0, "leg": 0})
            segments.append({**event, "start": a - lower, "end": b - lower,
                             "miles": event["miles"] * (b - a) / (event["end"] - event["start"])})
            cursor = b
        if cursor < upper:
            segments.append({"start": cursor - lower, "end": 1440, "status": "off_duty", "label": "Planned off duty after delivery", "miles": 0, "kind": "padding", "mile_start": distance, "mile_end": distance, "leg": 1})
        totals = {status: sum(s["end"] - s["start"] for s in segments if s["status"] == status) for status in STATUSES}
        days.append({"date": (base + timedelta(days=day_index)).date().isoformat(), "segments": segments,
                     "totals": totals, "miles": sum(s["miles"] for s in segments)})
    return {"events": events, "days": days, "base_date": base.date().isoformat(), "departure": departure.isoformat(timespec="minutes"),
            "arrival": (base + timedelta(minutes=now)).isoformat(timespec="minutes"),
            "summary": {"miles": distance, "elapsed_minutes": now - begun,
                        "driving_minutes": sum(e["end"] - e["start"] for e in events if e["status"] == "driving"),
                        "on_duty_minutes": sum(e["end"] - e["start"] for e in events if e["status"] == "on_duty"),
                        "rest_minutes": sum(e["end"] - e["start"] for e in events if e["status"] == "off_duty"),
                        "cycle_remaining": max(0, 4200 - cycle), "days": len(days)}}
