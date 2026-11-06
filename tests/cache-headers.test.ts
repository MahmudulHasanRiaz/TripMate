import { describe, it, expect } from "vitest";

import {
  resolvePageCacheControl,
  PUBLIC_PAGE_CACHE_CONTROL,
  PRIVATE_PAGE_CACHE_CONTROL,
  type PageCacheDecisionInput,
} from "@/lib/cache-headers";

function input(
  overrides: Partial<PageCacheDecisionInput> = {},
): PageCacheDecisionInput {
  return {
    method: "GET",
    pathname: "/",
    headerNames: new Set<string>(),
    cookies: [],
    searchParamNames: new Set<string>(),
    accept: "text/html,application/xhtml+xml",
    ...overrides,
  };
}

describe("resolvePageCacheControl — public documents", () => {
  it("marks the anonymous homepage document public", () => {
    expect(resolvePageCacheControl(input())).toBe(PUBLIC_PAGE_CACHE_CONTROL);
  });

  it("marks anonymous public content pages public", () => {
    for (const pathname of [
      "/packages",
      "/packages/executive-umrah-14-day",
      "/services",
      "/destinations/maldives",
      "/blog/first-time-umrah-guide",
      "/visa",
      "/about-us",
      "/l/summer-umrah-offer",
    ]) {
      expect(resolvePageCacheControl(input({ pathname }))).toBe(
        PUBLIC_PAGE_CACHE_CONTROL,
      );
    }
  });

  it("treats HEAD like GET (crawlers/monitors)", () => {
    expect(resolvePageCacheControl(input({ method: "HEAD" }))).toBe(
      PUBLIC_PAGE_CACHE_CONTROL,
    );
  });
});

describe("resolvePageCacheControl — signed-in visitors stay private", () => {
  it("pins private when a session_token cookie is present", () => {
    expect(
      resolvePageCacheControl(
        input({
          cookies: [{ name: "better-auth.session_token", value: "abc.def" }],
        }),
      ),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("pins private for the __Secure- prefixed production cookie", () => {
    expect(
      resolvePageCacheControl(
        input({
          cookies: [
            { name: "__Secure-better-auth.session_token", value: "abc.def" },
          ],
        }),
      ),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("pins private when only the cookie-cache session_data cookie is present", () => {
    expect(
      resolvePageCacheControl(
        input({
          cookies: [{ name: "better-auth.session_data", value: "payload" }],
        }),
      ),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("treats an empty session cookie value as anonymous (post-sign-out residue)", () => {
    expect(
      resolvePageCacheControl(
        input({
          cookies: [{ name: "better-auth.session_token", value: "  " }],
        }),
      ),
    ).toBe(PUBLIC_PAGE_CACHE_CONTROL);
  });

  it("ignores unrelated cookies (theme, analytics)", () => {
    expect(
      resolvePageCacheControl(
        input({
          cookies: [
            { name: "tripmate-theme", value: "dark" },
            { name: "_ga", value: "GA1.1.123" },
          ],
        }),
      ),
    ).toBe(PUBLIC_PAGE_CACHE_CONTROL);
  });
});

describe("resolvePageCacheControl — RSC flight requests are never public", () => {
  it("pins private for RSC document navigations", () => {
    expect(
      resolvePageCacheControl(input({ headerNames: new Set(["rsc"]) })),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("pins private for prefetch and state-tree flight variants", () => {
    for (const name of [
      "next-router-prefetch",
      "next-router-state-tree",
      "next-router-segment-prefetch",
    ]) {
      expect(
        resolvePageCacheControl(input({ headerNames: new Set([name]) })),
      ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
    }
  });

  it("pins private for flight requests even on deep public paths", () => {
    expect(
      resolvePageCacheControl(
        input({
          pathname: "/packages/executive-umrah-14-day",
          headerNames: new Set(["rsc", "next-router-state-tree"]),
        }),
      ),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("pins private via the _rsc query parameter alone (platforms that strip router headers)", () => {
    expect(
      resolvePageCacheControl(
        input({ searchParamNames: new Set(["_rsc"]) }),
      ),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("pins private via the flight Accept header alone", () => {
    expect(
      resolvePageCacheControl(input({ accept: "text/x-component" })),
    ).toBe(PRIVATE_PAGE_CACHE_CONTROL);
  });

  it("stays public for a document Accept header and unrelated query params", () => {
    expect(
      resolvePageCacheControl(
        input({
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
          searchParamNames: new Set(["cat", "dest"]),
        }),
      ),
    ).toBe(PUBLIC_PAGE_CACHE_CONTROL);
  });
});

describe("resolvePageCacheControl — hands off everything else", () => {
  it("leaves non-GET/HEAD methods untouched (server actions are POSTs)", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(resolvePageCacheControl(input({ method }))).toBeNull();
    }
  });

  it("leaves non-public route areas untouched", () => {
    for (const pathname of [
      "/admin",
      "/admin/orders",
      "/account",
      "/account/bookings",
      "/login",
      "/signup",
      "/setup",
      "/api/auth/session",
      "/uploads/logo.webp",
    ]) {
      expect(resolvePageCacheControl(input({ pathname }))).toBeNull();
    }
  });

  it("does not match prefixes mid-segment (/administrator is not /admin)", () => {
    expect(
      resolvePageCacheControl(input({ pathname: "/administrator-guide" })),
    ).toBe(PUBLIC_PAGE_CACHE_CONTROL);
  });

  it("leaves static files untouched", () => {
    for (const pathname of ["/favicon.ico", "/og-cover.jpg", "/robots.txt"]) {
      expect(resolvePageCacheControl(input({ pathname }))).toBeNull();
    }
  });
});
