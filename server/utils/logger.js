/** Tiny leveled logger. Coloured in development, plain lines in production. */
import { env } from '../config/env.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const THRESHOLD = LEVELS[env.LOG_LEVEL] ?? LEVELS.info;

const ESC = String.fromCharCode(27); // ANSI CSI introducer
const DIM = `${ESC}[90m`;
const RESET = `${ESC}[0m`;
const PAINT = {
  debug: DIM,
  info: `${ESC}[36m`,
  warn: `${ESC}[33m`,
  error: `${ESC}[31m`,
};

function emit(level, args) {
  if (LEVELS[level] < THRESHOLD) return;
  const stamp = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const head = env.IS_PROD
    ? `${stamp} ${tag}`
    : `${PAINT[level]}${tag}${RESET} ${DIM}${stamp.slice(11, 19)}${RESET}`;
  const write = level === 'error' || level === 'warn' ? console.error : console.log;
  write(head, ...args);
}

export const logger = {
  debug: (...args) => emit('debug', args),
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args),
};

/** Colour helpers for the boot banner. */
export const paint = {
  dim: (text) => (env.IS_PROD ? text : `${DIM}${text}${RESET}`),
  violet: (text) => (env.IS_PROD ? text : `${ESC}[35m${text}${RESET}`),
  lime: (text) => (env.IS_PROD ? text : `${ESC}[92m${text}${RESET}`),
  bold: (text) => (env.IS_PROD ? text : `${ESC}[1m${text}${RESET}`),
};

export default logger;
