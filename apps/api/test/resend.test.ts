import { afterEach, describe, expect, it, vi } from 'vitest';
import { resendTransport } from '../src/mail/resend.js';
import { readBindings } from '../src/node-env.js';
import { defaultMailer } from '../src/create-app.js';
import { testEnv } from './helpers.js';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

const settings = { apiKey: 're_cle_de_test', from: 'candidash@example.test', fromName: 'Candidash' };
const email = {
  to: 'julien@example.com',
  subject: 'Code de validation - Candidash',
  text: 'Code : 123456',
  html: '<p>Code : 123456</p>',
};

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return respond();
  };
  return { calls, fetchFn };
}

const accepted = () => new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });

describe('envoi par l’API Resend', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts the email to Resend with the API key and the configured sender', async () => {
    const { calls, fetchFn } = fakeFetch(accepted);

    const sent = await resendTransport(settings, fetchFn)(email);

    expect(sent).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.resend.com/emails');
    expect(calls[0]!.init.method).toBe('POST');
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('authorization')).toBe('Bearer re_cle_de_test');
    expect(headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      from: 'Candidash <candidash@example.test>',
      to: 'julien@example.com',
      subject: 'Code de validation - Candidash',
      text: 'Code : 123456',
      html: '<p>Code : 123456</p>',
    });
  });

  it('passes the visitor as reply-to for the contact form, and omits html when there is none', async () => {
    const { calls, fetchFn } = fakeFetch(accepted);

    await resendTransport(settings, fetchFn)({
      to: 'support@example.test',
      subject: '[Candidash contact] Bonjour',
      text: 'Message',
      replyTo: { name: 'Ada Lovelace', email: 'ada@example.com' },
    });

    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      from: 'Candidash <candidash@example.test>',
      to: 'support@example.test',
      subject: '[Candidash contact] Bonjour',
      text: 'Message',
      reply_to: 'Ada Lovelace <ada@example.com>',
    });
  });

  it('reports a refused email as not sent, without the recipient nor the content in the logs', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void lines.push(args.join(' ')));
    const { fetchFn } = fakeFetch(
      () => new Response(JSON.stringify({ message: 'Invalid `to` field: julien@example.com' }), { status: 422 }),
    );

    const sent = await resendTransport(settings, fetchFn)(email);

    expect(sent).toBe(false);
    const log = lines.join('\n');
    expect(log).toContain('422');
    expect(log).toContain('j***@example.com');
    expect(log).not.toContain('julien@');
    expect(log).not.toContain('123456');
    expect(log).not.toContain('re_cle_de_test');
  });

  it('reports an unreachable Resend as not sent instead of failing the request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchFn: typeof fetch = async () => {
      throw new TypeError('fetch failed');
    };

    expect(await resendTransport(settings, fetchFn)(email)).toBe(false);
  });
});

describe('configuration du mail en production', () => {
  const base = {
    DATABASE_URL: testEnv().DATABASE_URL,
    ALLOWED_ORIGINS: 'https://candidash.example.test',
    JWT_SECRET: 'jwt-de-test',
    TOTP_ENCRYPTION_KEY: '0'.repeat(64),
    S3_ENDPOINT: 'https://compte.r2.cloudflarestorage.com',
    S3_ACCESS_KEY: 'cle',
    S3_SECRET_KEY: 'secret',
    S3_BUCKET: 'candidash-app',
    APP_ENV: 'production',
  };
  const resend = { RESEND_API_KEY: 're_cle_de_test', MAIL_FROM: 'candidash@example.test' };
  const smtp = { MAIL_HOST: 'smtp.example.test', MAIL_USER: 'robot@example.test', MAIL_PASSWORD: 'mdp' };

  afterEach(() => {
    vi.restoreAllMocks();
    sendMail.mockReset();
  });

  it('starts with Resend alone, without any SMTP variable', () => {
    expect(readBindings({ ...base, ...resend }).ENVIRONMENT).toBe('production');
  });

  it('refuses a Resend key without a sender, or with a sender that is not an address', () => {
    expect(() => readBindings({ ...base, RESEND_API_KEY: 're_cle_de_test' })).toThrow('MAIL_FROM');
    expect(() => readBindings({ ...base, ...resend, MAIL_FROM: 'Candidash' })).toThrow('MAIL_FROM');
  });

  it('sends through Resend rather than SMTP when both are configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => accepted());
    const mailer = defaultMailer(readBindings({ ...base, ...resend, ...smtp }));

    expect(await mailer.sendVerificationCode('julien@example.com', '123456')).toBe(true);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(fetchSpy.mock.calls[0]![0])).toBe('https://api.resend.com/emails');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('never calls Resend from a preview, even when its key leaks there', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => accepted());
    const { APP_ENV: _unused, ...withoutAppEnv } = base;
    const mailer = defaultMailer(readBindings({ ...withoutAppEnv, ...resend, VERCEL_ENV: 'preview' }));

    expect(await mailer.sendVerificationCode('julien@example.com', '123456')).toBe(true);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
