# Haulplan

A Django + React trip planner that turns current location, pickup, delivery and used cycle hours into a road route, driving/rest schedule and printable daily log sheets.

**Live app:** https://haulplan.onrender.com/  
**Source:** https://github.com/zaidmoqbel/haulplan

## Run locally

Requires Python 3.11+ and Node.js 20.19+ or 22+. On Windows, open PowerShell in this directory:

```powershell
.\start.ps1 -Install
```

Open http://127.0.0.1:8000. Later runs use `.\start.ps1`. The terminal must stay running. The first launch displays a clearly labeled saved example; Generate trip geocodes the entered US locations and requests a live road route.

Manual setup (Windows; use `.venv/bin/python` on macOS/Linux):

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
cd frontend
npm ci
npm run build
cd ../backend
..\.venv\Scripts\python.exe serve.py
```

Build before starting the server: WhiteNoise discovers the built assets at startup. Restart the server after every production rebuild. For frontend development, run `npm run dev` inside `frontend` while Django runs on port 8000; Vite proxies `/api` requests.

## Use

1. Enter three US cities or addresses, cycle hours used (0–70), and departure time.
2. Open Log & clock details to select the home-terminal offset and optionally fill driver, carrier, vehicle and shipment information.
3. Generate trip. Review the returned location names, route, estimated arrival and stop timeline.
4. Choose Daily logs and switch between dates. Download logs PDF creates a PDF with one page per day. Print opens the browser print dialog. Every day includes a full 24-hour graph, status totals, remarks and mileage.
5. Export trip downloads the full JSON plan, including geometry, directions, events, logs and the original inputs.

## Scheduling model

- Property carrier, 70-hour / 8-day cycle; no adverse-condition exception.
- Assume a fresh shift after at least 10 consecutive off-duty hours and a full fuel tank at departure.
- Maximum 11 driving hours per shift, within 14 elapsed hours from first duty.
- At most 8 cumulative driving hours before a 30-minute non-driving interruption. One-hour loading/unloading and 30-minute fueling qualify.
- One hour for pickup and one hour for delivery. Fuel no more than 1,000 driving miles apart; stop slightly early when whole-minute rounding requires it.
- Travel time is rounded up to minutes and uses the slower of OSRM's road estimate and a 55 mph average. Daily mileage is allocated proportionally to simulated driving time within each leg.
- With only a cycle total and no prior daily records, the planner cannot calculate rolling recaps. It retains used hours conservatively and schedules a 34-hour restart when more duty capacity is needed. The federal rule allows a restart; this planner chooses it because recap history is absent. Non-driving work is also kept within the planner's conservative cycle budget.
- Rest is off duty; the app does not assume the driver occupies a sleeper berth. Split-sleeper exceptions are not modeled.
- Daily records are split at midnight on a fixed home-terminal clock. Pre-departure and post-delivery gaps are explicitly assumed off duty. Replan at daylight-saving clock changes; the app does not model them automatically.

These are planning drafts, not certified ELD records or legal compliance determinations. Confirm actual activities, mileage, identity fields, signature and city/state remarks. Intermediate stops are approximate points on the road route, not verified fuel stations or legal parking. OSRM's road profile does not account for truck dimensions, weight, hazardous materials or live traffic.

## Maps and external services

Nominatim geocodes explicit submissions, restricted to US locations. Requests are serialized to at most one per 1.1 seconds and cached for seven days. OSRM routes are cached for a day. Run one application process with multiple threads to preserve the geocoder limit; for multiple processes/replicas use a shared rate limiter or another provider. Public services have no uptime guarantee. Upstream errors are shown explicitly; a saved example is available without network access.

The interactive Leaflet map uses bundled 2017 US Census state boundaries from `us-atlas`, so base geography remains visible without third-party tiles. The route itself follows OpenStreetMap roads returned by OSRM. This is a regional route map; turn instructions are available separately. The saved Chicago–Indianapolis–Dallas route was retrieved from OSRM on October 5, 2026.

Before public or higher-volume use, set `MAP_USER_AGENT` with a contact URL, review the providers' usage policies and configure suitable endpoints. Inputs are sent to these providers; no trip history or identity fields are stored by the app. The geocoder cache contains submitted location strings in hashed keys and returned location data.

## Tests and structure

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py test planner -v 2
..\.venv\Scripts\python.exe manage.py check
cd ../frontend
npm run build
npm run format:check
```

- `backend/planner/engine.py`: pure minute-based scheduling and calendar-day splitting.
- `backend/planner/providers.py`: geocoding/routing caches and approximate route locations.
- `backend/planner/views.py`: request validation and JSON API.
- `frontend/src`: form, route map, itinerary, duty graphs and printable logs.
- `docs/ANALYSIS.md`: source analysis, assumptions and scope.
- `docs/WALKTHROUGH.md`: a 3–5 minute recording script.
- `docs/VERIFICATION.md`: test results and known limits.

The API exposes GET `/api/health/`, GET `/api/csrf/` and POST `/api/plan/` and POST `/api/plan/pdf/`. POST requires a same-origin CSRF token. It accepts `current`, `pickup`, `dropoff`, `cycle_used`, `start` (`YYYY-MM-DDTHH:MM`), optional log fields, and an explicit `sample` boolean. A sample request always uses the three documented example cities. Successful responses contain `summary`, `events`, `days`, `route`, `places`, `input`, `departure` and `arrival`. Input errors return 400; provider failures return 502.

## Deployment

The included Dockerfile builds React and serves it with Django/WhiteNoise through Waitress on a single origin. No database is needed. `render.yaml` defines a Render Blueprint with a generated Django secret, health check and free web service. On Render, the service hostname is added to Django's allowed hosts and CSRF origins automatically. Set `MAP_USER_AGENT` to an identifiable value with a contact URL when creating the Blueprint. Environment variables are read from the process; `.env.example` is a reference, not an automatically loaded file.

```sh
docker build -t haulplan .
docker run --rm -p 8000:8000 --env-file .env haulplan
```

Use any container host with HTTPS termination and persistent cache storage if desired. The Docker build has not been exercised in this environment. A public deployment should include request throttling at the hosting edge and provider capacity planning. For Vercel, host the React build there and deploy Django separately; configure an `/api` reverse proxy so the browser continues to use one origin.

The GitHub Actions workflow checks backend tests and the frontend build on pushes and pull requests. The app is deployed from this repository to Render's free Docker web service. The free service may take extra time to respond after inactivity. A Loom walkthrough recording remains to be created.

## References

- User-supplied Full Stack Developer assessment and blank daily log image.
- [FMCSA Interstate Truck Driver's Guide, April 2022](https://www.fmcsa.dot.gov/sites/fmcsa.dot.gov/files/2022-04/FMCSA-HOS-395-DRIVERS-GUIDE-TO-HOS%282022-04-28%29.pdf)
- [FMCSA hours-of-service summary](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations)
- [Logbook walkthrough video](https://www.youtube.com/watch?v=whxe41XYXS8) — auto-generated transcript reviewed.
- [OSRM API](https://project-osrm.org/docs/v5.24.0/api/), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/)
- [US Atlas data and ISC license](https://github.com/topojson/us-atlas), derived from US Census boundaries.
