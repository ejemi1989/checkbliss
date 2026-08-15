import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { sendPageView } from "@/lib/analytics";
import { POST } from "@/app/api/analytics/page-view/route";

beforeAll(() => {
  delete process.env.GA_MEASUREMENT_ID;
  delete process.env.GA_API_SECRET;
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendPageView", () => {
  it("is a no-op when GA env vars are unset (mock mode)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await sendPageView({ path: "/", title: "Home" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs a page_view event to the MP endpoint when configured", async () => {
    vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA_API_SECRET", "test-secret");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendPageView({ path: "/book/lagoon-view-loft", title: "Booking", sessionId: "s1", clientId: "c1" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("measurement_id=G-TEST123");
    expect(String(url)).toContain("api_secret=test-secret");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.client_id).toBe("c1");
    expect(body.events[0].name).toBe("page_view");
    expect(body.events[0].params.page_location).toBe("/book/lagoon-view-loft");
  });
});

describe("POST /api/analytics/page-view", () => {
  it("returns 200 for a valid payload", async () => {
    const req = new NextRequest("http://localhost/api/analytics/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "/login", title: "Sign in" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 for an invalid payload", async () => {
    const req = new NextRequest("http://localhost/api/analytics/page-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-JSON bodies", async () => {
    const req = new NextRequest("http://localhost/api/analytics/page-view", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
