#!/usr/bin/env node
/**
 * License key generator — run this when a supporter pays on Buy Me a Coffee.
 *
 * Usage:
 *   GITFLOW_PRIVATE_KEY="$(cat private.pem)" node scripts/generate-key.js user@email.com [days]
 *
 * Output:
 *   GITFLOWPRO-<payload>.<signature>
 *
 * Keep your private key in a local file (never commit it).
 * Store it in: ~/gitflow-private.pem
 */

const { sign } = require('crypto');

const email = process.argv[2];
const days = parseInt(process.argv[3] ?? '365', 10);

if (!email) {
  console.error('Usage: node generate-key.js <email> [days=365]');
  process.exit(1);
}

const privateKey = process.env.GITFLOW_PRIVATE_KEY;
if (!privateKey) {
  console.error('Error: GITFLOW_PRIVATE_KEY env var not set.');
  console.error('  export GITFLOW_PRIVATE_KEY="$(cat ~/gitflow-private.pem)"');
  process.exit(1);
}

const expiry = new Date();
expiry.setDate(expiry.getDate() + days);
const expiryStr = expiry.toISOString().slice(0, 10);

const payload = `${email}:${expiryStr}`;
const payloadB64 = Buffer.from(payload).toString('base64url');

const signature = sign(null, Buffer.from(payload), privateKey);
const signatureB64 = signature.toString('base64url');

const licenseKey = `GITFLOWPRO-${payloadB64}.${signatureB64}`;

console.log('\n✔ License key generated:');
console.log(`\n  ${licenseKey}\n`);
console.log(`  Email:  ${email}`);
console.log(`  Expiry: ${expiryStr} (${days} days)\n`);
console.log('Send this key to the supporter. They set it with:');
console.log(`  export GITFLOW_PRO_KEY=${licenseKey}\n`);
