import app from '../hono/hono';
import result from '../model/result';
import agentService from '../service/agent-service';

app.post('/agent/auth/token', async (c) => {
	const data = await agentService.issueToken(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/agent/auth/tokens', async (c) => {
	const data = await agentService.listTokens(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/agent/auth/revoke', async (c) => {
	await agentService.revokeToken(c, await c.req.json());
	return c.json(result.ok());
});

app.delete('/agent/auth/me', async (c) => {
	const data = await agentService.revokeSelf(c);
	return c.json(result.ok(data));
});

app.get('/agent/info', (c) => {
	return c.json(result.ok(agentService.info(c)));
});

app.get('/agent/mailboxes', async (c) => {
	const data = await agentService.listMailboxes(c, c.req.query());
	return c.json(result.ok(data));
});

app.get('/agent/emails', async (c) => {
	const data = await agentService.listEmails(c, c.req.query());
	return c.json(result.ok(data));
});

app.get('/agent/emails/:id', async (c) => {
	const data = await agentService.getEmail(c, c.req.param('id'));
	return c.json(result.ok(data));
});

app.post('/agent/emails', async (c) => {
	const data = await agentService.sendEmail(c, await c.req.json());
	return c.json(result.ok(data));
});

app.put('/agent/emails/:id/read', async (c) => {
	await agentService.setReadFlag(c, c.req.param('id'), true);
	return c.json(result.ok());
});

app.put('/agent/emails/:id/unread', async (c) => {
	await agentService.setReadFlag(c, c.req.param('id'), false);
	return c.json(result.ok());
});

app.delete('/agent/emails/:id', async (c) => {
	await agentService.softDelete(c, [c.req.param('id')]);
	return c.json(result.ok());
});

app.post('/agent/emails/batch-delete', async (c) => {
	const body = await c.req.json();
	await agentService.softDelete(c, body && body.ids);
	return c.json(result.ok());
});

app.get('/agent/attachments/:attId', async (c) => {
	const { obj, meta } = await agentService.fetchAttachment(c, c.req.param('attId'));

	if (obj instanceof Response) {
		const headers = new Headers(obj.headers);
		if (meta.filename) {
			headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(meta.filename)}`);
		}
		return new Response(obj.body, { status: obj.status, headers });
	}

	const headers = new Headers();
	headers.set('Content-Type', meta.mimeType || obj.httpMetadata?.contentType || 'application/octet-stream');
	if (meta.filename) {
		headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(meta.filename)}`);
	}
	return new Response(obj.body, { headers });
});
