/**
 * Returns the value as a string, or an empty string when it is not a string.
 * Used to keep non-string request bodies from crashing handlers with a
 * TypeError on `.trim()`.
 * @param {unknown} value
 * @returns {string}
 */
export const asString = (value) => (typeof value === "string" ? value : "");
