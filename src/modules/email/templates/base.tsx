import { renderToStaticMarkup } from "react-dom/server";

/**
 * Minimal branded HTML shell shared by all transactional emails.
 *
 * RENDER API NOTE (version drift): @react-email/components ships its own
 * `render` util (re-exported from @react-email/render v2), but it is ASYNC
 * (streams through Suspense → Promise<string>), which would break this
 * function's sync `→ string` contract. This base shell uses no react-email
 * components — just inline-styled HTML (email clients ignore external CSS) —
 * so we render it with react-dom/server's synchronous renderToStaticMarkup.
 * Richer component-based templates (setup wizard, auth, etc.) can migrate to
 * react-email's async render when they need <Html>/<Button>/etc.; that is a
 * caller-side `await`, so it layers on without changing sendEmail's `html:
 * string` input.
 *
 * Styles are inline because most mail clients strip <style> blocks; colors are
 * the TripMate brand tokens (see UI spec §10).
 */
export function renderBaseEmail(opts: {
  heading: string;
  bodyHtml: string;
}): string {
  return renderToStaticMarkup(
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: 560,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <h2 style={{ color: "#0E5E5A" }}>{opts.heading}</h2>
      {/* eslint-disable-next-line react/no-danger -- bodyHtml is server-built from our own templates, never user input */}
      <div dangerouslySetInnerHTML={{ __html: opts.bodyHtml }} />
      <p style={{ color: "#888", fontSize: 12, marginTop: 32 }}>TripMate</p>
    </div>,
  );
}
