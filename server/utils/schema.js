/**
 * A very small declarative validator.
 *
 * Routes describe the shape they accept with `field.*` factories; `validate()`
 * returns cleaned values or a map of field -> message. No dependency, no
 * surprises, and the rules read like the form they guard.
 *
 *   const schema = { email: field.email({ required: true }) };
 *   const { values, errors } = validate(schema, req.body);
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[+()\-\s0-9]{6,20}$/;
const CONTROL_RE = /[\x00-\x1F\x7F]/g;
const CONTROL_KEEP_NEWLINE_RE = /[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g;

/** Collapse whitespace and strip control characters. */
const clean = (input) => String(input).replace(CONTROL_RE, ' ').replace(/\s+/g, ' ').trim();

function base({ required = false, label = 'This field', fallback = null }, parse) {
  return {
    required,
    label,
    fallback,
    parse(raw) {
      const missing = raw === undefined || raw === null || String(raw).trim() === '';
      if (missing) {
        if (required) throw new Error(`${label} is required.`);
        return fallback;
      }
      // JSON bodies can carry any type, and String() turns most of them into
      // something that looks plausible: ["a@b.com"] becomes "a@b.com" and
      // passes an email check, {a:1} becomes "[object Object]" and is stored.
      // Only scalars are ever a real answer to a form field.
      if (typeof raw === 'object' || typeof raw === 'function') {
        throw new Error(`${label} is not valid.`);
      }
      return parse(raw);
    },
  };
}

export const field = {
  string(options = {}) {
    const { min = 0, max = 500, label = 'This field' } = options;
    return base(options, (raw) => {
      const value = clean(raw);
      if (value.length < min) throw new Error(`${label} must be at least ${min} characters.`);
      return value.slice(0, max);
    });
  },

  text(options = {}) {
    // Like `string`, but keeps newlines — for message bodies.
    const { max = 2000, label = 'This field' } = options;
    return base(options, (raw) => {
      const value = String(raw)
        .replace(/\r\n/g, '\n')
        .replace(CONTROL_KEEP_NEWLINE_RE, '')
        .trim();
      if (value.length > max) throw new Error(`${label} must be under ${max} characters.`);
      return value;
    });
  },

  email(options = {}) {
    const { label = 'Email' } = options;
    return base({ ...options, label }, (raw) => {
      const value = clean(raw).toLowerCase();
      if (value.length > 254 || !EMAIL_RE.test(value)) {
        throw new Error('That email address does not look right.');
      }
      return value;
    });
  },

  url(options = {}) {
    const { label = 'Website' } = options;
    return base({ ...options, label }, (raw) => {
      let value = clean(raw);
      if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
      try {
        const parsed = new URL(value);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad protocol');
        return parsed.toString().slice(0, 300);
      } catch {
        throw new Error(`${label} must be a valid link.`);
      }
    });
  },

  phone(options = {}) {
    const { label = 'Phone' } = options;
    return base({ ...options, label }, (raw) => {
      const value = clean(raw);
      if (!PHONE_RE.test(value)) throw new Error(`${label} must be a valid number.`);
      return value;
    });
  },

  oneOf(allowed, options = {}) {
    const { label = 'This field' } = options;
    return base(options, (raw) => {
      const value = clean(raw).toLowerCase();
      if (!allowed.includes(value)) {
        throw new Error(`${label} must be one of: ${allowed.join(', ')}.`);
      }
      return value;
    });
  },

  integer(options = {}) {
    const {
      min = Number.MIN_SAFE_INTEGER,
      max = Number.MAX_SAFE_INTEGER,
      label = 'This field',
    } = options;
    return base(options, (raw) => {
      const value = Number.parseInt(String(raw), 10);
      if (!Number.isFinite(value)) throw new Error(`${label} must be a number.`);
      return Math.min(max, Math.max(min, value));
    });
  },

  /**
   * A field no human ever fills in. Bots fill everything, so a non-empty value
   * marks the submission as spam — the caller decides what to do with it.
   */
  honeypot(options = {}) {
    return { ...base(options, (raw) => clean(raw)), isHoneypot: true };
  },
};

/**
 * @returns {{ values: Record<string, unknown>, errors: Record<string, string>, trapped: boolean }}
 */
export function validate(schema, payload = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const values = {};
  const errors = {};
  let trapped = false;

  for (const [key, rule] of Object.entries(schema)) {
    try {
      const parsed = rule.parse(source[key]);
      if (rule.isHoneypot) {
        if (parsed) trapped = true;
        continue;
      }
      values[key] = parsed;
    } catch (error) {
      errors[key] = error.message;
    }
  }

  return { values, errors, trapped };
}

export default { field, validate };
