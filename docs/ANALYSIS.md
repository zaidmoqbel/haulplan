# Haulplan assessment analysis

The requested deliverable is a working Django and React application for planning a property-carrying driver's trip. The assessment supplies four primary inputs: current location, pickup, drop-off, and used cycle hours. It requires a route map with rests/stops and multiple filled daily log sheets as necessary.

## Source findings

- The assessment specifies 70 hours / 8 days, no adverse conditions, fuel at least every 1,000 miles, and one hour each for pickup and delivery.
- The supplied FMCSA guide describes 11 hours of driving after 10 consecutive hours off, a 14-hour driving window, a 30-minute interruption after 8 cumulative driving hours, and the 70-hour cycle. Non-driving work may satisfy the break. A 34-hour restart is optional under the rules.
- The [video](https://www.youtube.com/watch?v=whxe41XYXS8), reviewed through its auto-generated transcript, demonstrates four duty-status rows, quarter-hour marks, vertical connectors at status changes, location/activity remarks, vehicle/shipment fields, daily mileage, and four totals that add to 24 hours. Sleeper berth is a location; it must not be assumed for every rest.
- The supplied blank sheet is the layout reference. The app draws a clean scalable version rather than obscuring the low-resolution original with text.
- The [FMCSA summary](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations) was checked against the supplied 2022 guide.

## Implementation decisions

Use a pure Python minute-based scheduling engine behind a Django JSON API, and React with Leaflet for the interface. Geocode explicit submissions using Nominatim with caching and serialized requests; route with OSRM and show OpenStreetMap attribution. Use one origin, pickup and destination in that order. Never silently substitute a straight-line route when routing fails.

The four inputs cannot reveal today's previous driving or the age of cycle hours. Assume a fresh shift after 10 qualifying hours off and a full fuel tank; offer start date/time, home-terminal clock label, and optional log identity fields. Use 30 minutes for fuel, and a planning travel-time floor of 55 mph (or slower OSRM estimate). Exhausted cycle capacity triggers a conservative 34-hour restart rather than inventing rolling recaps. All timestamps use one fixed home-terminal UTC offset; DST changes require splitting/replanning. Planned breaks/rests are off duty unless explicitly known to be sleeper berth.

Stop coordinates are estimated along route geometry; they are planning points, not verified parking/fuel facilities. OSRM's road-car profile does not verify commercial-truck restrictions. Generated sheets are planned duty records, not actual certified ELD records. Unknown identity/vehicle/shipping details remain visibly unprovided; no signatures are fabricated.

## Build and acceptance sequence

1. Test the scheduler: breaks, shift limits, cycle resets, fuel spacing, loading, midnight splits, 24-hour totals, invalid inputs, long trips.
2. Implement and test API validation, geocoding and routing adapters, and explicit upstream failures.
3. Build the trip form, map, itinerary, directions and daily logs, including print/export, loading, empty and error states.
4. Verify the built application in a browser and ship source, reproducible setup/deployment instructions and a 3–5 minute walkthrough script.

Visual direction: muted paper background, dark forest green navigation, compact trip form, large map, restrained orange route highlights, tabular time values, and high-contrast paper logs. At small widths, stack the form and route. Primary action: Generate trip. Existing valid results remain visible during recalculation, with stale-input status clearly indicated.

## Publication boundary

The assessment asks for a hosted URL, GitHub code and a Loom recording. These are external publication deliverables described by the document, not independent authorization to publish to the user's accounts. The local implementation and deployment materials are prepared first; account publication requires the user's chosen destination and authorization.
