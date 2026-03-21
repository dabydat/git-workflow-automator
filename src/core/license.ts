import { verify } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

// Public key embedded at build time — private key never leaves your machine
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAQaeJq/NCsiVeVUjpZNbpMls+3nJNmsluvgDCXDj7mL0=
-----END PUBLIC KEY-----`;

const KEY_PREFIX = 'GITFLOWPRO-';
const CONFIG_PATH = join(homedir(), '.gitflow-pro');
const ENV_VAR = 'GITFLOW_PRO_KEY';

export interface LicenseInfo {
  email: string;
  expiry: string;
}

export function getLicenseKey(): string | null {
  if (process.env[ENV_VAR]) return process.env[ENV_VAR];
  if (existsSync(CONFIG_PATH)) return readFileSync(CONFIG_PATH, 'utf8').trim();
  return null;
}

export function validateLicense(key: string): LicenseInfo {
  if (!key.startsWith(KEY_PREFIX)) throw new Error('Invalid key format');

  const parts = key.slice(KEY_PREFIX.length).split('.');
  if (parts.length !== 2) throw new Error('Invalid key format');

  const [payloadB64, signatureB64] = parts as [string, string];
  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const signature = Buffer.from(signatureB64, 'base64url');

  const valid = verify(null, Buffer.from(payload), PUBLIC_KEY, signature);
  if (!valid) throw new Error('License signature is invalid');

  const [email, expiry] = payload.split(':') as [string, string];
  if (!email || !expiry) throw new Error('Malformed license payload');

  if (new Date(expiry) < new Date()) throw new Error(`License expired on ${expiry}`);

  return { email, expiry };
}

export function checkProLicense(): LicenseInfo {
  const key = getLicenseKey();

  if (!key) {
    throw new ProRequiredError(
      'This command requires gitflow-auto Pro.',
      'Get Pro at: https://buymeacoffee.com/dabydat/membership\n' +
      `  Then set your key:  export ${ENV_VAR}=<your-key>`,
    );
  }

  try {
    return validateLicense(key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new ProRequiredError(
      `License key invalid: ${msg}`,
      'Get a new key at: https://buymeacoffee.com/dabydat/membership',
    );
  }
}

export class ProRequiredError extends Error {
  constructor(
    message: string,
    public readonly suggestion: string,
  ) {
    super(message);
    this.name = 'ProRequiredError';
  }
}
