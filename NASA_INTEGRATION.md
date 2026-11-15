# AstroBorneo NASA integration guide

## Verification — 2026-11-14 UTC

- **NASA CCMC: IMPLEMENTED AND VERIFIED (FLR)**. Official guide:
  https://ccmc.gsfc.nasa.gov/DONKI/api/ ; machine-readable schema:
  https://ccmc.gsfc.nasa.gov/DONKI/api/openapi/ .
  Schema v2.0 explicitly documents `/get/FLR`, `/get/SEP`, `/get/CME`,
  `startDate` and `endDate`. No authentication scheme or API key is documented.
  FLR request for 2024-05-10 succeeded with real records including
  `2024-05-10T00:10:00-FLR-001`, beginTime `2024-05-10T00:10Z`,
  link https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30665/-1 .
  SEP/CME field mappings checked against their individual schema definitions;
  see verification results below for actual requests.
  Actual SEP and CME requests for 2024-05-10 through 2024-05-12 succeeded:
  6 SEP records and 14 CME records. Example IDs:
  2024-05-10T12:59:00-SEP-001 and 2024-05-10T02:12:00-CME-001.
  App endpoint FLR check returned LIVE_DATA/CONNECTED with 15 validated records.
  Automated checks passed for missing key, empty results, upstream failure,
  rate limiting, error redaction, archive/simulated modes, normalization,
  invalid dates and cache timestamps. Both packages pass TypeScript checks.
  Private-key connectivity and full browser refresh interaction were not tested.
- **NASA Open APIs: IMPLEMENTED BUT NOT VERIFIED**. https://api.nasa.gov/
  separately documents `/DONKI/FLR`, `/DONKI/SEP`, `/DONKI/CME`,
  `startDate`, `endDate`, `api_key`. A real FLR request using NASA's public
  DEMO_KEY returned HTTP 404 with `/DONKI-API/get/FLR/` in the error body.
  This does not prove all Open APIs endpoints are unavailable. No private key
  has been supplied or tested. Runtime never silently uses DEMO_KEY.
- **RadLab, OSDR, Mars Trek: PLACEHOLDER / CONFIGURATION REQUIRED**.
  Typed disabled adapters in `src/services/optional-nasa.ts`; no production
  field mappings or live connection claims. RadLab keeps absorbed and equivalent
  dose separate with original units and instrument/location; ISS data is not
  lunar data. OSDR study metadata is not a human-health conclusion.
- **CSA STEM/Youth and Food Production Toolkit: reference links only**,
  not software integrations. No API keys needed. No third-party media embedded.

## Server configuration

Backend: `server/nasa/` and API routing in `server/index.ts`.
Add NASA_API_KEY to the project's secure Secrets settings, never chat, client
environment variables, localStorage, source control or a public configuration file.
The only consumer of that key is the server-side Open APIs adapter.

Non-secret server variables:

| Variable | Default | Options |
| --- | --- | --- |
| NASA_DONKI_PROVIDER | NASA_CCMC | NASA_CCMC, NASA_OPEN_APIS, OFFLINE |
| NASA_CACHE_SECONDS | 900 | 30–86400 (clamped) |

Restart the Node server after changing server configuration. Published environments
also need their own appropriate configuration. Do not use a VITE_ prefix.
Selecting Open APIs without a key returns NOT_CONFIGURED and an archived fallback.
Selecting OFFLINE disables requests but preserves archived educational context.

## Controlled endpoint

`GET /api/nasa/space-weather?eventType=FLR&startDate=2024-05-10&endDate=2024-05-10&mode=auto`

Only FLR, SEP, CME are accepted. Dates must be real calendar dates, ordered,
no more than 30 days apart, and not in the future. Unknown parameters are rejected.
Mode is auto, archived, or simulated. Arbitrary URLs, hosts, credentials and provider
selection are never accepted from the browser. Redirects are rejected; timeout 10s.
Technical exceptions and upstream response bodies are not returned or logged.
Request logging strips query strings.

CCMC requests are server-to-server: browser CORS permission is not relied on.
Its published OpenAPI does not specify a rate ceiling; do not invent one.
AstroBorneo enforces a shared 2-second upstream request interval, deduplicates concurrent
identical queries, caches up to 100 query results and caches failures for 30 seconds.
These limits are per server process, not a distributed quota. Open APIs documents
default 1000/hour keys, and DEMO_KEY limits of 30/hour and 50/day; check your plan.

## Validation and data modes

Normalization checks arrays; FLR uses flrID/beginTime, SEP uses sepID/eventTime,
CME uses activityID/startTime. Missing IDs/timestamps/source links are omitted
and counted as incomplete, never synthesized. UTC timestamps and original time
strings are retained. Source URLs must be HTTPS on allowlisted NASA CCMC hosts,
with no credentials or query strings. Raw upstream fields are not sent to children.

LIVE_DATA requires at least one validated observation from a successful request.
It means API-retrieved, NOT that the historical event is happening now.
Empty arrays explicitly return EMPTY with no invented events. Cache hits retain
retrieval timestamps; stale successful cache fallback becomes ARCHIVED_DATA.
Other failures use the verified bundled archive, and the UI explicitly says it
is a separate historical example, not a match for the selected date range.
If no archive is bundled, use SIMULATED_SCENARIO.

The client also bundles the same record to handle backend/network unavailability.
Refresh respects cache TTL; it does not force a new upstream request.
This is network-independent gameplay once the app has loaded, not an installable
offline PWA or guaranteed cold-start offline website.

## Archive provenance

Record retrieved from the CCMC FLR request above at
2026-11-14T02:14:11.720Z (download completion timestamp).
Backend `server/nasa/archive.ts`, frontend `src/services/archived-context.ts`.
To add records: retrieve an official response; validate using the normalizer;
preserve ID, original/UTC observation time, source URL and actual retrieval time.
Review attribution, then update both bundles together. Never use test fixtures
in these files. Historical selector is in the existing context panel.

## UI and scientific interpretation

`SpaceWeatherContext` appears in Mission Control and About/Sources. It shows
request status, mode, date/type controls, observation selector and attribution.
`DataSourcePanel` and the mission header continue to say SIMULATED_SCENARIO because
game resource values are ALWAYS simulated. Provider badges marked READY describe
adapter verification, not current connectivity. Context never writes game storage,
quiz answers, scoring or resource state.

Real observation: what NASA recorded. Game rule: the fixed cycle-4 protection
exercise. There is no flare-to-safety/dose mapping. DONKI consists of preliminary
research products, provided as-is, not operational forecasts. NOAA SWPC is the
US official source of space-weather forecasts. See:
https://ccmc.gsfc.nasa.gov/tools/DONKI/#disclaimer
https://ccmc.gsfc.nasa.gov/tools/DONKI/#donki-rules-of-the-road

## Troubleshooting and secret checks

- NOT_CONFIGURED: verify provider selection and server secret existence.
- AUTH_ERROR: update the server secret; never paste it into debugging output.
- RATE_LIMITED: wait and reuse cached queries.
- EMPTY: try another valid range; no observations is a legitimate result.
- INVALID_RECORDS: provider schema may have changed; inspect safely server-side.
- UNAVAILABLE/UPSTREAM_ERROR: timeout, invalid JSON, network or provider failure;
  archive fallback is expected. Do not turn these into green connection badges.

Inspect browser Network: only the controlled /api route, no API key parameters.
Search built public assets for NASA_API_KEY, api_key and a controlled test sentinel.
Do not print or search using an actual private key. Verify with a deliberately
fake test-only credential and confirm neither success nor failure payload includes it.
Credentials have not been tested until a real configured request succeeds.


## Migration notice
This source was adapted from the previously uploaded Replit Phase 1 project. Historical upstream verification statements are preserved from that project and were not independently re-tested during this offline conversion. The new single-server structure needs a real in-platform HTTP verification before claims of live connectivity.
