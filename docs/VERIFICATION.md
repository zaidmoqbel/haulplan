# Verification results

Verified locally on October 5–6, 2026.

## Automated checks

- Django test runner: 16 tests passed. Engine tests exercise multiple distances and cycle balances, including 6,000-mile trips, 69.9/70 used hours, zero-mile legs, midnight crossings, fuel intervals, loading as a qualifying break and 24-hour totals.
- API tests passed for the saved real route, invalid JSON and inputs, allowed methods/content type, explicit upstream failure, and CSRF enforcement.
- Mutation check: permitting 661 driving minutes instead of 660 caused three engine tests to fail. The original rule was restored, and all tests passed again.
- Django system checks passed with no reported issues.
- React production build passed. Maps are split into a separate bundle. Prettier format check passed.

## Runtime checks

- Served the built React application through Django and WhiteNoise with Waitress on localhost:8000.
- Live Nominatim lookup and OSRM routing for Chicago → Indianapolis → Dallas returned HTTP 200: 1,080.49 miles, 1,199 driving minutes, 150 other-duty minutes and 600 rest minutes, totaling 1,949 elapsed minutes.
- Browser generation with 70 cycle hours used produced a 34-hour restart and four daily log sheets.
- Verified switching daily sheets, four status totals, the 24:00 daily total, road directions and recovery to the saved example.
- Verified JSON export downloaded an actual 631,473-byte JSON file; its contents include the plan, route and two daily sheets.
- Inspected the desktop and mobile interface. No document-level horizontal overflow at widths 320, 768, 1024 and 1440 pixels.
- Browser error/warning log was empty after the final rebuild.
- Direct PDF export returned a valid two-page PDF for the saved trip. Both pages were rendered to PNG and inspected for clipped content, status lines, remarks, totals and signature space.

## Public deployment checks — October 6, 2026

- GitHub repository: https://github.com/zaidmoqbel/haulplan, with the complete committed source and Render Blueprint.
- GitHub Actions: first `Verify application` run completed successfully.
- Render free Docker service: https://haulplan.onrender.com/ reported Live for commit `adfe9d5`.
- Public health, HTML, JavaScript asset, saved sample plan and two-page PDF each returned HTTP 200.
- A live Chicago → Indianapolis → Dallas request returned HTTP 200 with 1,080.5 miles and two daily sheets.
- The deployed app was opened in a browser and displayed the route overview and two daily logs.

## Limits of verification

The print action was exercised without a JavaScript error, and the on-screen log layout was inspected. The embedded browser did not expose a native print dialog, so browser print pagination remains unverified. Use the separately verified Download logs PDF action for reliable pagination. The Docker deployment and any public hosting environment have not been run here.

These tests verify the implemented conservative planning model; they do not establish FMCSA certification or validate actual parking/fuel facilities, truck restrictions, historical cycle recaps or daylight-saving changes.
