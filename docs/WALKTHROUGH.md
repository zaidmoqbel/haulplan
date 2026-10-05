# Recording script

Target length: 4 minutes. This is a recording guide, not a claim that a Loom video has been recorded or uploaded.

## 0:00–0:40 — The problem and inputs

“Haulplan turns trip details into a route and a planned duty schedule. The frontend is React and the backend is Django. Enter the current location, pickup, drop-off and cycle hours used. I also expose departure time and home-terminal clock, because daily logs need a calendar boundary.”

Show the form and optional log identity fields. Explain that the initial example is explicitly labeled and based on a saved real OSRM response.

## 0:40–1:30 — Route and stops

Generate a route. Point out the resolved city names and total mileage. Pan or zoom the regional map and click a stop. Scroll through loading, driving, daily rest, fuel and delivery events. Open Directions to show both route legs.

“The map uses bundled US Census boundaries with an OSRM road route. Nominatim handles address lookup. External failures produce a visible error instead of a made-up route. Stop points are estimates and still need a suitable facility.”

## 1:30–2:15 — Logs and export

Open Daily logs, switch to day two and point to the graph, four status totals, mileage and activity remarks. Explain off-duty padding and the use of one terminal clock across time zones. Show Print all logs / PDF and JSON export.

“These are planned records. Actual locations, duty changes and a driver signature must be verified. I don't label every rest as sleeper berth because the video explains that sleeper berth is a physical location.”

## 2:15–3:20 — Code and rules

Open `engine.py`. Explain minute-based arithmetic, 11 driving hours, the 14-hour window, the 8-hour break threshold and how loading or fuel can satisfy a non-driving break. Show splitting each event at midnight and allocating mileage across days.

“Cycle hours alone do not reveal the previous seven days. I conservatively insert a 34-hour restart instead of inventing hours that roll off. Fuel is scheduled at or slightly before 1,000 miles. The design keeps scheduling independent from HTTP, maps and the UI.”

Open `providers.py` and `views.py`; point out geocoder caching/throttling, request validation and CSRF protection.

## 3:20–4:00 — Verification and tradeoffs

Run `python manage.py test planner -v 2`. Show tests for breaks, midnight, cycle exhaustion, fueling and the CSRF flow. Set cycle used to 70, generate and point out the restart.

“The 55 mph planning floor slows down optimistic travel estimates. This is an assessment planner, with clear limits: no truck restriction database, rolling recap history or automatic DST transitions. Next production steps would be a truck routing provider, actual rest-area selection and complete duty-history input.”

Finish on the route overview. Add the actual public URL and repository URL only after those are published.
