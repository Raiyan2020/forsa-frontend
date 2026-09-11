/**
 * Sanitizer for rich text that arrives from the API and is rendered with
 * `dangerouslySetInnerHTML` inside Client Components.
 *
 * Opportunity, Learn & Serve and event descriptions are authored in the app's
 * TipTap editor by any organization account, and FAQ answers by the dashboard.
 * The backend stores all of them verbatim — it has no HTML sanitizer — so the
 * markup reaching these components is attacker-controlled. `script-src` carries
 * `'unsafe-inline'` for Tailwind's inline styles, which also permits inline
 * event handlers, so an `onerror=` attribute would execute for every visitor to
 * a public detail page; the auth token lives in `localStorage` and `img-src`
 * allows any https origin, so that is a session-stealing hole. Strip it here.
 *
 * Not `@/lib/sanitizeHtml`: that one is the server-only CMS sanitizer whose
 * callers hand the result down as a prop. These components render on both
 * sides — Client Components are still prerendered — and the bare `dompurify`
 * browser build has no DOM to work with during prerender, which made it
 * silently emit unsanitized markup into the server-rendered HTML. The
 * `isomorphic-dompurify` entry point resolves per environment: jsdom on Node,
 * and an 883-byte jsdom-free re-export of `dompurify` in the browser bundle,
 * so the client cost is the same as importing `dompurify` directly.
 */
import DOMPurify from "isomorphic-dompurify";

/**
 * Matches the CMS allowlist in `@/lib/sanitizeHtml` so admin- and
 * organization-authored content render identically, minus the structural tags
 * the editor never emits.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "small", "mark",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
];

/**
 * `style` is omitted here exactly as it is in the CMS allowlist. An
 * attacker-controlled style attribute on a public detail page is enough for a
 * `position:fixed` full-viewport overlay — a phishing surface on Fursa's own
 * origin — and DOMPurify does not filter CSS property values. Alignment and
 * direction already come from `dir`/`class` and the components' own RTL
 * handling, so nothing the editor needs is lost.
 */
const ALLOWED_ATTR = [
  "href", "target", "rel", "title", "dir", "lang",
  "src", "alt", "width", "height", "loading",
  "colspan", "rowspan", "class",
];

/**
 * Attributes that are NOT URLs. Setting `ALLOWED_URI_REGEXP` makes DOMPurify
 * run *every* attribute value through it unless the attribute is known to be
 * URI-safe, so without this list `dir`, `lang`, `target`, `rel`, `colspan`,
 * `rowspan`, `width` and `height` were silently dropped from otherwise valid
 * content — losing `dir` flips Arabic pages back to LTR and losing
 * `colspan`/`rowspan` collapses admin-authored tables. `href` and `src` stay
 * out of this list so they keep being validated as URLs.
 */
const URI_SAFE_ATTR = [
  "target", "rel", "dir", "lang",
  "width", "height", "loading",
  "colspan", "rowspan",
];

/**
 * Sanitize API-supplied HTML for `dangerouslySetInnerHTML`.
 *
 * Returns "" for nullish input so a caller can render the result directly.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,
    // Only web-safe schemes and relative links, so no `javascript:` href.
    // DOMPurify still permits `data:` on `img`/`video`/`audio` src and offers
    // no way to opt out (`ADD_DATA_URI_TAGS` only adds to its default set) —
    // harmless here, since browsers execute neither `data:text/html` nor a
    // scripted SVG when either is loaded through `<img>`.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i,
  });
}
