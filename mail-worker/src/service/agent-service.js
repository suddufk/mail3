import orm from '../entity/orm';
import email from '../entity/email';
import account from '../entity/account';
import { att } from '../entity/att';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const';
import BizError from '../error/biz-error';
import KvConst from '../const/kv-const';
import emailService from './email-service';
import attService from './att-service';
import r2Service from './r2-service';
import userService from './user-service';
import cryptoUtils from '../utils/crypto-utils';
import emailUtils from '../utils/email-utils';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const ESCAPE_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, ch => ESCAPE_HTML[ch]);
}

async function verifyAdmin(c, params) {
	const { email: adminEmail, password } = params || {};
	if (!adminEmail || !password) {
		throw new BizError('email and password required', 400);
	}
	if (adminEmail !== c.env.admin) {
		throw new BizError('not admin', 403);
	}
	const userRow = await userService.selectByEmailIncludeDel(c, adminEmail);
	if (!userRow || userRow.isDel === isDel.DELETE) {
		throw new BizError('admin not found', 404);
	}
	if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
		throw new BizError('password incorrect', 401);
	}
}

async function loadTokens(c) {
	const stored = await c.env.kv.get(KvConst.AGENT_KEYS, { type: 'json' });
	return Array.isArray(stored?.tokens) ? stored.tokens : [];
}

async function saveTokens(c, tokens) {
	await c.env.kv.put(KvConst.AGENT_KEYS, JSON.stringify({ tokens }));
}

const agentService = {

	async issueToken(c, params) {
		await verifyAdmin(c, params);

		const tokens = await loadTokens(c);
		const item = {
			id: uuidv4(),
			name: (params.name || 'default').toString().slice(0, 64),
			token: uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''),
			createTime: dayjs().toISOString()
		};
		tokens.push(item);
		await saveTokens(c, tokens);

		return { id: item.id, name: item.name, token: item.token, createTime: item.createTime };
	},

	async listTokens(c, params) {
		await verifyAdmin(c, params);
		const tokens = await loadTokens(c);
		return tokens.map(item => ({ id: item.id, name: item.name, createTime: item.createTime }));
	},

	async revokeToken(c, params) {
		await verifyAdmin(c, params);
		const { tokenId, token } = params || {};
		if (!tokenId && !token) throw new BizError('tokenId or token required', 400);
		const tokens = await loadTokens(c);
		const next = tokens.filter(item => {
			if (tokenId && item.id === tokenId) return false;
			if (token && item.token === token) return false;
			return true;
		});
		if (next.length === tokens.length) throw new BizError('token not found', 404);
		await saveTokens(c, next);
	},

	async revokeSelf(c) {
		const presented = c.req.header('Authorization');
		if (!presented) throw new BizError('agent token required', 401);
		const tokens = await loadTokens(c);
		const next = tokens.filter(item => item.token !== presented);
		if (next.length === tokens.length) throw new BizError('token not found', 404);
		await saveTokens(c, next);
		return { ok: true };
	},

	info(c) {
		const domains = Array.isArray(c.env.domain) ? c.env.domain : [];
		return {
			name: 'cloud-mail agent api',
			version: 1,
			authHeader: 'Authorization',
			domains,
			endpoints: {
				auth: {
					'POST /agent/auth/token': 'admin: mint a new agent token. body: {email,password,name?}',
					'POST /agent/auth/tokens': 'admin: list agent tokens (no secrets). body: {email,password}',
					'POST /agent/auth/revoke': 'admin: revoke a token. body: {email,password,tokenId}'
				},
				mailboxes: {
					'GET /agent/mailboxes': 'list mailboxes. query: email?, page?, size?'
				},
				emails: {
					'GET /agent/emails': 'list. query: mailbox|accountId, type(receive|send), unread(0|1), q, page, size, after, before',
					'GET /agent/emails/:id': 'get full email + attachments meta',
					'POST /agent/emails': 'send. body: {from,to[],subject,text?,html?,replyTo?,name?,attachments?[]}',
					'PUT /agent/emails/:id/read': 'mark read',
					'PUT /agent/emails/:id/unread': 'mark unread',
					'DELETE /agent/emails/:id': 'soft delete',
					'POST /agent/emails/batch-delete': 'soft delete many. body: {ids:[...]}'
				},
				attachments: {
					'GET /agent/attachments/:attId': 'download binary'
				}
			}
		};
	},

	async listMailboxes(c, params) {
		let { email: filterEmail, page, size } = params || {};
		page = Math.max(1, Number(page) || 1);
		size = Math.min(200, Math.max(1, Number(size) || 50));
		const offset = (page - 1) * size;

		const conditions = [eq(account.isDel, isDel.NORMAL)];
		if (filterEmail) {
			conditions.push(sql`${account.email} COLLATE NOCASE LIKE ${'%' + filterEmail + '%'}`);
		}

		const where = conditions.length > 1 ? and(...conditions) : conditions[0];
		const list = await orm(c).select().from(account).where(where).orderBy(asc(account.accountId)).limit(size).offset(offset).all();
		const totalRow = await orm(c).select({ total: count() }).from(account).where(where).get();
		return { list, total: totalRow.total, page, size };
	},

	async resolveAccount(c, params) {
		const { mailbox, accountId } = params || {};
		if (accountId) {
			const acc = await orm(c).select().from(account).where(eq(account.accountId, Number(accountId))).get();
			if (!acc) throw new BizError('accountId not found', 404);
			return acc;
		}
		if (mailbox) {
			const acc = await orm(c).select().from(account).where(sql`${account.email} COLLATE NOCASE = ${mailbox}`).get();
			if (!acc) throw new BizError('mailbox not found', 404);
			return acc;
		}
		return null;
	},

	async listEmails(c, params) {
		let { mailbox, accountId, type, unread, q, page, size, after, before } = params || {};
		page = Math.max(1, Number(page) || 1);
		size = Math.min(100, Math.max(1, Number(size) || 20));
		const offset = (page - 1) * size;

		const conditions = [eq(email.isDel, isDel.NORMAL)];

		const acc = await this.resolveAccount(c, { mailbox, accountId });
		if (acc) {
			conditions.push(eq(email.accountId, acc.accountId));
		}

		if (type === 'send' || type === 'SEND' || type === 1 || type === '1') {
			conditions.push(eq(email.type, emailConst.type.SEND));
		} else if (type === 'receive' || type === 'RECEIVE' || type === 0 || type === '0') {
			conditions.push(eq(email.type, emailConst.type.RECEIVE));
		}

		if (unread === '1' || unread === 1 || unread === true || unread === 'true') {
			conditions.push(eq(email.unread, emailConst.unread.UNREAD));
		} else if (unread === '0' || unread === 0 || unread === false || unread === 'false') {
			conditions.push(eq(email.unread, emailConst.unread.READ));
		}

		if (q) {
			conditions.push(or(
				sql`${email.subject} COLLATE NOCASE LIKE ${'%' + q + '%'}`,
				sql`${email.text} COLLATE NOCASE LIKE ${'%' + q + '%'}`,
				sql`${email.content} COLLATE NOCASE LIKE ${'%' + q + '%'}`,
				sql`${email.sendEmail} COLLATE NOCASE LIKE ${'%' + q + '%'}`,
				sql`${email.toEmail} COLLATE NOCASE LIKE ${'%' + q + '%'}`
			));
		}

		if (after) conditions.push(sql`${email.createTime} >= ${after}`);
		if (before) conditions.push(sql`${email.createTime} <= ${before}`);

		const where = conditions.length > 1 ? and(...conditions) : conditions[0];

		const list = await orm(c).select().from(email).where(where)
			.orderBy(desc(email.emailId)).limit(size).offset(offset).all();
		const totalRow = await orm(c).select({ total: count() }).from(email).where(where).get();

		await emailService.emailAddAtt(c, list);
		return { list, total: totalRow.total, page, size };
	},

	async getEmail(c, idParam) {
		const emailId = Number(idParam);
		if (!emailId) throw new BizError('invalid email id', 400);
		const row = await orm(c).select().from(email).where(eq(email.emailId, emailId)).get();
		if (!row) throw new BizError('email not found', 404);
		const attList = await attService.selectByEmailIds(c, [emailId]);
		row.attList = attList;
		return row;
	},

	async sendEmail(c, params) {
		const { from, to, subject, text, html, replyTo, name, attachments, cc, bcc } = params || {};
		if (!from) throw new BizError('from required', 400);
		if (!subject) throw new BizError('subject required', 400);

		const recipients = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
		if (recipients.length === 0) throw new BizError('to required', 400);

		const acc = await orm(c).select().from(account).where(sql`${account.email} COLLATE NOCASE = ${from}`).get();
		if (!acc) throw new BizError('from mailbox not registered', 404);

		const content = html || (text ? `<pre>${escapeHtml(text)}</pre>` : '');

		const payload = {
			accountId: acc.accountId,
			name: name || emailUtils.getName(acc.email),
			sendType: replyTo ? 'reply' : 'normal',
			emailId: replyTo ? Number(replyTo) : undefined,
			receiveEmail: recipients,
			text: text || '',
			content,
			subject,
			cc: Array.isArray(cc) ? cc : [],
			bcc: Array.isArray(bcc) ? bcc : [],
			attachments: Array.isArray(attachments) ? attachments : []
		};

		const result = await emailService.send(c, payload, acc.userId);
		return Array.isArray(result) ? result[0] : result;
	},

	async setReadFlag(c, idParam, isRead) {
		const emailId = Number(idParam);
		if (!emailId) throw new BizError('invalid email id', 400);
		const value = isRead ? emailConst.unread.READ : emailConst.unread.UNREAD;
		await orm(c).update(email).set({ unread: value }).where(eq(email.emailId, emailId)).run();
	},

	async softDelete(c, ids) {
		const list = (Array.isArray(ids) ? ids : [ids]).map(Number).filter(n => Number.isFinite(n) && n > 0);
		if (list.length === 0) throw new BizError('no valid email id', 400);
		await orm(c).update(email).set({ isDel: isDel.DELETE }).where(inArray(email.emailId, list)).run();
	},

	async fetchAttachment(c, attIdParam) {
		const attId = Number(attIdParam);
		if (!attId) throw new BizError('invalid attId', 400);
		const meta = await orm(c).select().from(att).where(eq(att.attId, attId)).get();
		if (!meta) throw new BizError('attachment not found', 404);
		const obj = await r2Service.getObj(c, meta.key);
		if (!obj) throw new BizError('attachment content missing', 404);
		return { obj, meta };
	}
};

export default agentService;
