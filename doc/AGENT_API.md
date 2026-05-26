# Agent API

A REST-style, token-authenticated API surface designed for LLM agents and
automation scripts. All routes live under `/api/agent/*` and are protected by a
dedicated **agent token** that is stored separately from the existing
`/public/*` token (so the two can be rotated independently).

- Base path: `https://<your-domain>/api/agent`
- Auth header: `Authorization: <agent-token>`
- Response envelope: `{ code: 200, message: "success", data: ... }`
  (`code !== 200` indicates failure; `message` carries the reason).

## Token management

Agent tokens are minted by the administrator using their **email + password**.
Multiple tokens can coexist (one per agent / one per environment).

### Mint a token

```bash
curl -X POST https://your-domain/api/agent/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<admin-password>","name":"my-bot"}'
```

Response:

```json
{"code":200,"data":{"id":"<uuid>","name":"my-bot","token":"<store-this>","createTime":"..."}}
```

Store the `token` securely — it is shown only once.

### List tokens (no secrets returned)

```bash
curl -X POST https://your-domain/api/agent/auth/tokens \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<admin-password>"}'
```

### Revoke a token (admin)

Admin can revoke by either the token's `id` (from `list tokens`) or by the
raw `token` string — whichever they have on hand.

```bash
# by tokenId
curl -X POST https://your-domain/api/agent/auth/revoke \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<admin-password>","tokenId":"<id>"}'

# by token string (e.g. when someone hands you a leaked token to kill)
curl -X POST https://your-domain/api/agent/auth/revoke \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<admin-password>","token":"<the-leaked-token>"}'
```

### Self-revoke (token cancels itself)

No admin credentials needed — the holder of a token can retire it just by
calling this with the token in the `Authorization` header. Useful for an
agent that wants to rotate its own credentials after it has minted a
replacement.

```bash
curl -X DELETE https://your-domain/api/agent/auth/me \
  -H 'Authorization: <agent-token>'
```

After this call, the token is invalidated for both REST and MCP. Subsequent
requests with it will return HTTP 401.

## Discovery

```bash
curl https://your-domain/api/agent/info \
  -H 'Authorization: <agent-token>'
```

Returns the configured domains and the full endpoint catalog so an agent can
self-discover without external schema.

## Mailboxes (sending accounts)

```bash
# list
curl 'https://your-domain/api/agent/mailboxes?page=1&size=50' \
  -H 'Authorization: <agent-token>'

# search by substring
curl 'https://your-domain/api/agent/mailboxes?email=alice' \
  -H 'Authorization: <agent-token>'
```

## Emails

### List

```
GET /api/agent/emails
  ?mailbox=<email>        # OR accountId=<id>
  &type=receive|send      # default: any
  &unread=0|1             # default: any
  &q=<keyword>            # subject/text/content/from/to search
  &after=YYYY-MM-DD HH:MM:SS
  &before=YYYY-MM-DD HH:MM:SS
  &page=1
  &size=20                # max 100
```

Returns `{ list, total, page, size }`. Every email row already includes
`attList` with attachment metadata.

### Get a single email

```bash
curl https://your-domain/api/agent/emails/123 \
  -H 'Authorization: <agent-token>'
```

Returns the full email row including `content` (HTML), `text` (plain text)
and `attList`.

### Send / reply

```bash
curl -X POST https://your-domain/api/agent/emails \
  -H 'Authorization: <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "bot@your-domain",
    "to": ["alice@example.com"],
    "subject": "Hello",
    "text": "plain-text body",
    "html": "<p>html body</p>",
    "replyTo": 123,
    "attachments": [
      { "filename": "report.pdf", "content": "<base64>", "contentType": "application/pdf" }
    ]
  }'
```

`from` **must** be a mailbox that already exists in the system. `replyTo` is
optional — when set, the email is treated as a reply (headers + threading
preserved). `attachments[].content` accepts a `data:` URL or raw base64.

### Mark as read / unread

```bash
curl -X PUT https://your-domain/api/agent/emails/123/read   -H 'Authorization: <agent-token>'
curl -X PUT https://your-domain/api/agent/emails/123/unread -H 'Authorization: <agent-token>'
```

### Soft delete

```bash
# single
curl -X DELETE https://your-domain/api/agent/emails/123 \
  -H 'Authorization: <agent-token>'

# batch
curl -X POST https://your-domain/api/agent/emails/batch-delete \
  -H 'Authorization: <agent-token>' \
  -H 'Content-Type: application/json' \
  -d '{"ids":[123,124,125]}'
```

Soft-deleted emails remain in the database with `isDel=1` and disappear from
list queries. Admins can still restore them through the UI / `allEmail`
endpoints.

## Attachments

```bash
curl -OJ https://your-domain/api/agent/attachments/42 \
  -H 'Authorization: <agent-token>'
```

Streams the binary content with the original `filename` (RFC 5987 encoded) and
`mimeType` set on the response.

## Auth model recap

| Route | Auth |
| --- | --- |
| `POST /agent/auth/token` `tokens` `revoke` | admin email + password (in body) |
| `GET/POST/PUT/DELETE /agent/...` (everything else) | `Authorization: <agent-token>` header |

The agent token is **not** the user's JWT and **not** the `/public/genToken`
key — they are three independent credentials. Revoking an agent token has no
effect on user sessions or the public-API token.
