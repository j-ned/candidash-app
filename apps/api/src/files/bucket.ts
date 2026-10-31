import { AwsClient } from 'aws4fetch';

/** Ce que l'API utilise du stockage : dépôt, lecture en flux, suppression. */
export type Bucket = {
  put(key: string, body: ArrayBuffer, options?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
  delete(keys: string | string[]): Promise<void>;
};

export type S3Config = { endpoint: string; region: string; accessKeyId: string; secretAccessKey: string; bucket: string };

/** Bucket R2 (API S3, mêmes clés que l'API Nest) : requêtes signées par aws4fetch, sans SDK. */
export function s3Bucket(config: S3Config): Bucket {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region,
    service: 's3',
  });
  const url = (key: string) =>
    `${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

  async function send(key: string, init: RequestInit): Promise<Response> {
    const res = await client.fetch(url(key), init);
    if (!res.ok && res.status !== 404) {
      throw new Error(`Stockage : ${init.method ?? 'GET'} ${key} → ${res.status}`);
    }
    return res;
  }

  return {
    async put(key, body, options) {
      await send(key, {
        method: 'PUT',
        body,
        headers: { 'Content-Type': options?.contentType ?? 'application/octet-stream' },
      });
    },
    async get(key) {
      const res = await send(key, { method: 'GET' });
      return res.status === 404 || !res.body ? null : { body: res.body };
    },
    async delete(keys) {
      await Promise.all([keys].flat().map((key) => send(key, { method: 'DELETE' })));
    },
  };
}
