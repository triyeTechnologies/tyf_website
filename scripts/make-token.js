/**
 * Prints a fresh admin token to paste into .env.
 *
 *   npm run token
 */
import crypto from 'node:crypto';

console.log(`ADMIN_TOKEN=${crypto.randomBytes(24).toString('base64url')}`);
