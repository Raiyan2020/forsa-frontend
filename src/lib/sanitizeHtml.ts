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

export function sanitizeCmsHtml(html: string | null | undefined): string {
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

/** True when the string contains markup worth rendering as HTML. */
export function containsHtml(value: string | null | undefined): boolean {
  return !!value && /<[a-z][\s\S]*>/i.test(value);
}
