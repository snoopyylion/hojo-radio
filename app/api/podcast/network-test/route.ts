// app/api/podcast/network-test/route.ts
import { NextRequest } from "next/server";

const LARGE_BYTES = 4 * 1024 * 1024; // 4 MB
const SMALL_BYTES =     512 * 1024;  // 512 KB

// Returns a plain ArrayBuffer (not SharedArrayBuffer) filled with
// incompressible pseudo-random bytes. ArrayBuffer is always accepted
// as a Response body — no TypeScript ambiguity.
function buildPayload(bytes: number): ArrayBuffer {
  // Use a regular ArrayBuffer (not allocUnsafe/SharedArrayBuffer)
  const ab  = new ArrayBuffer(bytes);
  const buf = new Uint8Array(ab);
  let a = 0x12345678;
  let b = 0xdeadbeef;
  for (let i = 0; i < bytes; i++) {
    a = (Math.imul(a ^ (a >>> 7),  0x9E3779B9) >>> 0);
    b = (Math.imul(b ^ (b << 17),  0x6C62272E) >>> 0);
    buf[i] = (a ^ b) & 0xff;
  }
  return ab; // return the underlying ArrayBuffer, not the view
}

// Lazy singletons — built once per worker lifetime
let _large: ArrayBuffer | null = null;
let _small: ArrayBuffer | null = null;
const getLarge = (): ArrayBuffer => { if (!_large) _large = buildPayload(LARGE_BYTES); return _large; };
const getSmall = (): ArrayBuffer => { if (!_small) _small = buildPayload(SMALL_BYTES); return _small; };

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Content-Encoding": "identity",   // tell proxies: do NOT compress
  "Surrogate-Control": "no-store",
  "Vary": "*",
} as const;

// HEAD — pure latency probe, no body
export async function HEAD() {
  return new Response(null, { status: 200, headers: { ...NO_CACHE } });
}

// GET — download speed test
// ?size=large (4 MB default) | ?size=small (512 KB)
export async function GET(req: NextRequest) {
  const useSmall = req.nextUrl.searchParams.get("size") === "small";
  const payload  = useSmall ? getSmall() : getLarge();
  const bytes    = useSmall ? SMALL_BYTES : LARGE_BYTES;

  // ArrayBuffer is unambiguously accepted as BodyInit
  return new Response(payload, {
    status: 200,
    headers: {
      ...NO_CACHE,
      "Content-Type":   "application/octet-stream",
      "Content-Length": String(bytes),
      "X-Payload-Bytes": String(bytes),
    },
  });
}

// POST — upload speed test: drain body, respond immediately
export async function POST(req: NextRequest) {
  let received = 0;
  try {
    const reader = req.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value?.byteLength ?? 0;
      }
    }
  } catch { /* ignore client aborts */ }

  return new Response(
    JSON.stringify({ ok: true, receivedBytes: received }),
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}