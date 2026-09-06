# Why this service runs in `sin1`

The Neon database lives in `ap-southeast-1` (Singapore). Vercel Functions
default to `iad1` (Washington D.C.) for every new project, so until this file
existed the request path was:

    visitor (India) -> bom1 edge -> function in iad1 -> database in sin1

Every query crossed the Pacific and came back. Measured against the deployed
service, `GET /health` — which is one `SELECT 1` and 33 bytes of JSON — took
**~900ms** warm, essentially all of it that round trip.

`regions: ["sin1"]` puts the function next to its data instead. Hobby plans
get a single region, which is why this is one entry and not a list.

## Verifying it took effect

    curl -sI https://portfolio-rust-be.vercel.app/health | grep x-vercel-id

The middle segment is the execution region. It should read `sin1`:

    x-vercel-id: bom1::sin1::xxxxx-0000000000000-000000000000

If it still says `iad1`, the setting did not apply — check
Settings -> Functions -> Function Regions in the Vercel dashboard, then
redeploy (the region is bound at deploy time, not at request time).

## If the database ever moves

Keep the two together and update this file. The pairing is the point; which
region they share matters much less than that they share one.
