/**
 * VpsKvAdapter — implements the Cloudflare KV namespace interface
 * but talks to the vps-kv-server over HTTPS.
 *
 * Supported operations:
 *   get(key)
 *   put(key, value, { expirationTtl, metadata })
 *   delete(key | key[])
 *   list({ prefix })
 *   getWithMetadata(key)
 */
export class VpsKvAdapter {
  constructor(url, secret) {
    this.url = url.replace(/\/$/, '');
    this.headers = {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    };
  }

  async _call(op, payload) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ op, ...payload }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[VpsKv] ${op} failed (${res.status}): ${err}`);
    }
    return res.json();
  }

  // ── helpers for binary values ──────────────────────────────────────────────
  static _toBase64(value) {
    if (value instanceof ArrayBuffer) value = new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      let s = '';
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    }
    return null; // not binary
  }

  static _fromBase64(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  // ── KV interface ───────────────────────────────────────────────────────────
  async get(key) {
    const { value } = await this._call('get', { key });
    return value ?? null;
  }

  async put(key, value, options = {}) {
    const b64 = VpsKvAdapter._toBase64(value);
    await this._call('put', {
      key,
      value: b64 ?? value,          // string or base64
      isBase64: b64 !== null,
      metadata: options.metadata ?? null,
      expirationTtl: options.expirationTtl ?? null,
    });
  }

  async delete(key) {
    await this._call('delete', { key });
  }

  async list(options = {}) {
    return this._call('list', { prefix: options.prefix ?? '' });
  }

  async getWithMetadata(key) {
    const { value, metadata, isBase64 } = await this._call('getWithMetadata', { key });
    if (value === null) return { value: null, metadata: null };
    return {
      value: isBase64 ? VpsKvAdapter._fromBase64(value) : value,
      metadata: metadata ?? null,
    };
  }
}

/**
 * Returns a KV instance: Cloudflare KV if bound, VPS adapter if configured.
 * Returns null if neither is available.
 */
export function resolveKv(env) {
  if (env.kv) return env.kv;
  if (env.vps_kv_url && env.vps_kv_secret) {
    return new VpsKvAdapter(env.vps_kv_url, env.vps_kv_secret);
  }
  return null;
}
