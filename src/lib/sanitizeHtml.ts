/**
 * Sanitizer for admin-authored HTML coming from the CMS (`content_en` /
 * `content_ar` on `GET /pages/{slug}/`).
 *
 * Dashboard editors are trusted-ish, not trusted: the markup is still rendered
 * with `dangerouslySetInnerHTML`, so it goes through DOMPurify with an
 * allowlist first. Sanitize on the SERVER and pass the resulting string down —
 * `isomorphic-dompurify` pulls in jsdom on Node, which has no business in the
 * client bundle.
 */
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span", "section", "article",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "small", "mark",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "title", "dir", "lang",
  "src", "alt", "width", "height", "loading",
  "colspan", "rowspan", "class", "id",
];

export function sanitizeCmsHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // No `javascript:` / `data:` URLs — only web-safe schemes and relative links.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i,
  });
}

/** True when the string contains markup worth rendering as HTML. */
export function containsHtml(value: string | null | undefined): boolean {
  return !!value && /<[a-z][\s\S]*>/i.test(value);
}
