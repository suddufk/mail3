import { parseHTML } from 'linkedom';
import { domainToUnicode } from 'node:url';

const emailUtils = {

	getDomain(email) {
		if (typeof email !== 'string') return '';
		const parts = email.split('@');
		return parts.length === 2 ? parts[1] : '';
	},

	getName(email) {
		if (typeof email !== 'string') return '';
		const parts = email.trim().split('@');
		return parts.length === 2 ? parts[0] : '';
	},

	formatText(text) {
		if (!text) return ''
		return text
			.split('\n')
			.map(line => {
				return line.replace(/[\u200B-\u200F\uFEFF\u034F\u200B-\u200F\u00A0\u3000\u00AD]/g, '')
					.replace(/\s+/g, ' ')
					.trim();
			})
			.join('\n')
			.replace(/\n{3,}/g, '\n')
			.trim();
	},

	htmlToText(content) {
		if (!content) return ''
		try {
			const wrappedContent = content.includes('<body')
				? content
				: `<!DOCTYPE html><html><body>${content}</body></html>`;
			const { document } = parseHTML(wrappedContent);
			document.querySelectorAll('style, script, title').forEach(el => el.remove());
			let text = document.body.innerText;
			return this.formatText(text);
		} catch (e) {
			console.error(e)
			return ''
		}
	},

	toPunycode(domain) {
		if (typeof domain !== 'string') return '';
		try {
			return new URL('http://' + domain).hostname;
		} catch {
			return domain;
		}
	},

	getPunycodeDomain(email) {
		const domain = this.getDomain(email);
		return this.toPunycode(domain);
	},

	toPunycodeEmail(email) {
		if (typeof email !== 'string') return '';
		const parts = email.split('@');
		if (parts.length !== 2) return email;
		return parts[0] + '@' + this.toPunycode(parts[1]);
	},

	fromPunycode(domain) {
		if (typeof domain !== 'string') return '';
		if (!domain.includes('xn--')) return domain;
		try {
			return domainToUnicode(domain);
		} catch {
			return domain;
		}
	},

	fromPunycodeEmail(email) {
		if (typeof email !== 'string') return '';
		const parts = email.split('@');
		if (parts.length !== 2) return email;
		return parts[0] + '@' + this.fromPunycode(parts[1]);
	},

	convertEmailsToUnicode(data) {
		if (Array.isArray(data)) {
			return data.map(item => this.convertEmailsToUnicode(item));
		}
		if (data && typeof data === 'object') {
			const result = {};
			for (const key of Object.keys(data)) {
				const value = data[key];
				if (['email', 'sendEmail', 'toEmail', 'userEmail', 'send_email', 'to_email', 'from', 'to', 'address'].includes(key) && typeof value === 'string' && value.includes('@')) {
					result[key] = this.fromPunycodeEmail(value);
				} else if (key === 'recipient' && typeof value === 'string') {
					try {
						const parsed = JSON.parse(value);
						result[key] = JSON.stringify(this.convertEmailsToUnicode(parsed));
					} catch {
						result[key] = value;
					}
				} else {
					result[key] = this.convertEmailsToUnicode(value);
				}
			}
			return result;
		}
		return data;
	}
};

export default emailUtils;
