import { parseHTML } from 'linkedom';

/**
 * List of HTML tag names that are considered dangerous and must be removed.
 * These tags can load external content, execute scripts, or redirect users.
 */
const DANGEROUS_TAGS = [
	'script', 'iframe', 'object', 'embed', 'applet',
	'form', 'input', 'textarea', 'select', 'button',
	'base', 'meta', 'link', 'math', 'svg',
];

/**
 * Regex matching any on* event-handler attribute name (case-insensitive).
 */
const EVENT_HANDLER_RE = /^on/i;

/**
 * Regex matching dangerous URI schemes in attribute values.
 */
const DANGEROUS_URI_RE = /^\s*(?:javascript|vbscript|data\s*:(?!image\/(?:png|jpe?g|gif|webp|svg\+xml)))/i;

/**
 * Attributes whose values may contain URIs that need scheme validation.
 */
const URI_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'background'];

/**
 * Sanitize untrusted HTML by removing dangerous tags, event-handler attributes,
 * and javascript: / vbscript: / data: URIs.
 *
 * This is intended for rendering email content from untrusted senders.
 *
 * @param {string} html - Raw HTML string from untrusted source
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHtml(html) {
	const { document } = parseHTML(html);

	// 1. Remove all dangerous tags entirely (tag + children)
	for (const tag of DANGEROUS_TAGS) {
		document.querySelectorAll(tag).forEach(el => el.remove());
	}

	// 2. Walk every element to strip event handlers and dangerous URIs
	const allElements = document.querySelectorAll('*');
	for (const el of allElements) {
		const attrs = Array.from(el.attributes || []);
		for (const attr of attrs) {
			const name = attr.name.toLowerCase();

			// Remove any on* event handler attribute
			if (EVENT_HANDLER_RE.test(name)) {
				el.removeAttribute(attr.name);
				continue;
			}

			// Validate URI attributes
			if (URI_ATTRS.includes(name) && DANGEROUS_URI_RE.test(attr.value)) {
				el.removeAttribute(attr.name);
			}
		}
	}

	return document.toString();
}

/**
 * Escape a plain-text string for safe insertion into HTML.
 *
 * @param {string} text - Plain text to escape
 * @returns {string} HTML-escaped string
 */
export function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
