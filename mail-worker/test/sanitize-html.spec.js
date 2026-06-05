import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeHtml } from '../src/utils/sanitize-html';

describe('sanitizeHtml', () => {
	it('removes script tags', () => {
		const input = '<p>hello</p><script>alert(1)</script>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<script');
		expect(result).toContain('<p>hello</p>');
	});

	it('removes onerror event handler from img tags', () => {
		const input = '<img src=x onerror="alert(document.cookie)">';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('onerror');
	});

	it('removes onload event handler from svg tags', () => {
		const input = '<svg onload="alert(1)">';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('onload');
	});

	it('removes onclick event handler', () => {
		const input = '<div onclick="alert(1)">click me</div>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('onclick');
		expect(result).toContain('click me');
	});

	it('removes onmouseover event handler', () => {
		const input = '<a onmouseover="alert(1)">hover</a>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('onmouseover');
	});

	it('removes iframe tags', () => {
		const input = '<p>hello</p><iframe src="https://evil.com"></iframe>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<iframe');
	});

	it('removes object tags', () => {
		const input = '<object data="evil.swf"></object>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<object');
	});

	it('removes embed tags', () => {
		const input = '<embed src="evil.swf">';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<embed');
	});

	it('removes form tags', () => {
		const input = '<form action="https://evil.com"><input type="text"></form>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<form');
	});

	it('removes javascript: URIs from href', () => {
		const input = '<a href="javascript:alert(1)">click</a>';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('javascript:');
	});

	it('removes javascript: URIs from src', () => {
		const input = '<img src="javascript:alert(1)">';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('javascript:');
	});

	it('removes base tags', () => {
		const input = '<base href="https://evil.com">';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<base');
	});

	it('removes meta refresh tags', () => {
		const input = '<meta http-equiv="refresh" content="0;url=https://evil.com">';
		const result = sanitizeHtml(input);
		expect(result).not.toContain('<meta');
	});

	it('preserves safe HTML content', () => {
		const input = '<p>Hello <b>world</b></p><img src="photo.jpg"><a href="https://example.com">link</a>';
		const result = sanitizeHtml(input);
		expect(result).toContain('<p>');
		expect(result).toContain('<b>world</b>');
		expect(result).toContain('<img');
		expect(result).toContain('src="photo.jpg"');
		expect(result).toContain('href="https://example.com"');
	});

	it('preserves table structures', () => {
		const input = '<table><tr><td>cell</td></tr></table>';
		const result = sanitizeHtml(input);
		expect(result).toContain('<table>');
		expect(result).toContain('<td>');
	});

	it('handles mixed case event handlers', () => {
		const input = '<img src=x oNeRrOr="alert(1)">';
		const result = sanitizeHtml(input);
		expect(result).not.toMatch(/onerror/i);
	});
});

describe('escapeHtml', () => {
	it('escapes HTML special characters', () => {
		const input = '<script>alert("xss")</script>';
		const result = escapeHtml(input);
		expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
	});

	it('escapes ampersands', () => {
		expect(escapeHtml('a&b')).toBe('a&amp;b');
	});

	it('escapes single quotes', () => {
		expect(escapeHtml("it's")).toBe('it&#39;s');
	});

	it('handles empty string', () => {
		expect(escapeHtml('')).toBe('');
	});
});
