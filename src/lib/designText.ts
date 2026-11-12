// The characters a name on a design may use. Must match cleanCustomText in
// the website's aiDesign.web.js, which turns anything else into a space.
const NOT_ALLOWED = /[^A-Za-z0-9 '.\-!?$@&+#%,:]/g;

/** The text with every character the website wouldn't print taken out. */
export function allowedTextOnly(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(NOT_ALLOWED, "");
}
