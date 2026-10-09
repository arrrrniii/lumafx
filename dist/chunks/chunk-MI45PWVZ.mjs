import {
  __export
} from "./chunk-VIHIR2BE.mjs";

// src/forms/core.ts
var core_exports = {};
__export(core_exports, {
  addRule: () => addRule,
  checkValue: () => checkValue,
  distance: () => distance,
  message: () => message,
  parsePhone: () => parsePhone,
  parseRules: () => parseRules,
  passwordScore: () => passwordScore,
  schema: () => schema,
  suggestEmail: () => suggestEmail,
  validate: () => validate
});
var MESSAGES = {
  en: {
    required: "This field is required.",
    email: "Enter a valid email address.",
    emailSuggest: "Did you mean {s}?",
    phone: "Enter a valid phone number.",
    url: "Enter a valid web address.",
    minlength: "Use at least {n} characters.",
    maxlength: "Use at most {n} characters.",
    min: "Must be at least {n}.",
    max: "Must be at most {n}.",
    number: "Enter a number.",
    integer: "Enter a whole number.",
    pattern: "Use the requested format.",
    match: "This doesn\u2019t match.",
    password: "Use 8 or more characters with letters and numbers.",
    name: "Enter a valid name.",
    date: "Enter a valid date.",
    oneof: "Choose one of the options.",
    accepted: "Please accept to continue.",
    spam: "Your message could not be sent. Please try again.",
    invalid: "Check this field."
  },
  sq: {
    required: "Kjo fush\xEB \xEBsht\xEB e detyrueshme.",
    email: "Shkruani nj\xEB adres\xEB email t\xEB vlefshme.",
    emailSuggest: "Mos keni dashur {s}?",
    phone: "Shkruani nj\xEB num\xEBr telefoni t\xEB vlefsh\xEBm.",
    url: "Shkruani nj\xEB adres\xEB web t\xEB vlefshme.",
    minlength: "P\xEBrdorni t\xEB pakt\xEBn {n} karaktere.",
    maxlength: "P\xEBrdorni jo m\xEB shum\xEB se {n} karaktere.",
    min: "Duhet t\xEB jet\xEB t\xEB pakt\xEBn {n}.",
    max: "Duhet t\xEB jet\xEB jo m\xEB shum\xEB se {n}.",
    number: "Shkruani nj\xEB num\xEBr.",
    integer: "Shkruani nj\xEB num\xEBr t\xEB plot\xEB.",
    pattern: "P\xEBrdorni formatin e k\xEBrkuar.",
    match: "Nuk p\xEBrputhet.",
    password: "P\xEBrdorni 8 ose m\xEB shum\xEB karaktere me shkronja dhe numra.",
    name: "Shkruani nj\xEB em\xEBr t\xEB vlefsh\xEBm.",
    date: "Shkruani nj\xEB dat\xEB t\xEB vlefshme.",
    oneof: "Zgjidhni nj\xEB nga opsionet.",
    accepted: "Ju lutemi pranoni p\xEBr t\xEB vazhduar.",
    spam: "Mesazhi nuk mund t\xEB d\xEBrgohej. Provoni s\xEBrish.",
    invalid: "Kontrolloni k\xEBt\xEB fush\xEB."
  }
};
function message(code, opts = {}, vars = {}) {
  const lang = (opts.locale || "en").slice(0, 2).toLowerCase();
  const text = opts.messages?.[code] ?? MESSAGES[lang]?.[code] ?? MESSAGES.en[code] ?? MESSAGES.en.invalid;
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
var EMAIL = /^[^\s@"(),:;<>[\]\\]{1,64}@(?=.{4,253}$)(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}]{2,63}$/u;
var KNOWN_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "msn.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.de",
  "yandex.com",
  "mail.com",
  "zoho.com",
  "yahoo.it",
  "libero.it",
  "hotmail.it",
  "outlook.it",
  "virgilio.it",
  "web.de",
  "t-online.de",
  "hotmail.co.uk",
  "yahoo.co.uk",
  "icloud.com",
  "abv.bg"
];
var TLD_FIX = { con: "com", cmo: "com", ocm: "com", vom: "com", xom: "com", cpm: "com", comm: "com", om: "com", nett: "net", ner: "net", orgg: "org", ogr: "org" };
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
function suggestEmail(email) {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  let domain = email.slice(at + 1).toLowerCase();
  if (!domain) return null;
  if (KNOWN_DOMAINS.includes(domain)) return null;
  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  if (TLD_FIX[tld]) {
    parts[parts.length - 1] = TLD_FIX[tld];
    domain = parts.join(".");
    if (KNOWN_DOMAINS.includes(domain)) return `${local}@${domain}`;
  }
  let best = null;
  let bestD = 3;
  for (const k of KNOWN_DOMAINS) {
    const dd = distance(domain, k);
    if (dd < bestD) {
      bestD = dd;
      best = k;
    }
  }
  if (best && bestD <= 2) return `${local}@${best}`;
  return domain !== email.slice(at + 1).toLowerCase() ? `${local}@${domain}` : null;
}
var COUNTRIES = {
  AL: ["355", [8, 9], "0"],
  XK: ["383", [8, 9], "0"],
  MK: ["389", [8], "0"],
  ME: ["382", [8], "0"],
  RS: ["381", [8, 9, 10], "0"],
  GR: ["30", [10], ""],
  IT: ["39", [6, 7, 8, 9, 10, 11], ""],
  TR: ["90", [10], "0"],
  DE: ["49", [7, 8, 9, 10, 11, 12], "0"],
  AT: ["43", [7, 8, 9, 10, 11, 12, 13], "0"],
  CH: ["41", [9], "0"],
  FR: ["33", [9], "0"],
  GB: ["44", [10], "0"],
  IE: ["353", [7, 8, 9], "0"],
  ES: ["34", [9], ""],
  PT: ["351", [9], ""],
  NL: ["31", [9], "0"],
  BE: ["32", [8, 9], "0"],
  US: ["1", [10], "1"],
  CA: ["1", [10], "1"],
  AE: ["971", [8, 9], "0"],
  SA: ["966", [9], "0"],
  HR: ["385", [8, 9], "0"],
  SI: ["386", [8], "0"],
  BG: ["359", [8, 9], "0"],
  RO: ["40", [9], "0"],
  PL: ["48", [9], ""],
  SE: ["46", [7, 8, 9], "0"],
  NO: ["47", [8], ""],
  DK: ["45", [8], ""],
  CZ: ["420", [9], ""],
  HU: ["36", [8, 9], "06"],
  UA: ["380", [9], "0"],
  BA: ["387", [8], "0"],
  CY: ["357", [8], ""],
  MT: ["356", [8], ""],
  LU: ["352", [6, 7, 8, 9], ""],
  AU: ["61", [9], "0"],
  IN: ["91", [10], "0"],
  BR: ["55", [10, 11], "0"],
  MX: ["52", [10], ""],
  EG: ["20", [9, 10], "0"],
  IL: ["972", [8, 9], "0"]
};
var BY_CODE = /* @__PURE__ */ new Map();
for (const v of Object.values(COUNTRIES)) if (!BY_CODE.has(v[0])) BY_CODE.set(v[0], v);
function parsePhone(input, country = "AL") {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/[^\d\s()+./-]/.test(raw.replace(/^tel:/i, "").replace(/(ext\.?|x)\s*\d+$/i, ""))) return null;
  let digits = raw.replace(/\D/g, "");
  const intl = /^\s*(\+|00)/.test(raw);
  if (intl && raw.trim().startsWith("00")) digits = digits.slice(2);
  let code = "";
  let national = "";
  let lengths = null;
  if (intl) {
    for (const len of [3, 2, 1]) {
      const c = digits.slice(0, len);
      const known = BY_CODE.get(c);
      if (known) {
        code = c;
        national = digits.slice(len);
        lengths = known[1];
        if (known[2] && national.startsWith(known[2]) && !known[1].includes(national.length)) national = national.slice(known[2].length);
        break;
      }
    }
    if (!code) {
      if (digits.length < 8 || digits.length > 15) return null;
      return { e164: "+" + digits, international: "+" + digits, callingCode: "", national: digits };
    }
  } else {
    const c = COUNTRIES[country.toUpperCase()] || COUNTRIES.AL;
    code = c[0];
    lengths = c[1];
    national = digits;
    if (c[2] && national.startsWith(c[2])) national = national.slice(c[2].length);
  }
  if (!lengths || !lengths.includes(national.length)) return null;
  if (/^(\d)\1+$/.test(national)) return null;
  return { e164: `+${code}${national}`, international: `+${code} ${groupDigits(national)}`, callingCode: code, national };
}
function groupDigits(n) {
  if (n.length <= 4) return n;
  if (n.length === 9) return `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
  if (n.length === 10) return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  if (n.length === 8) return `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
  return n.replace(/(\d{3})(?=\d)/g, "$1 ");
}
function passwordScore(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) s++;
  if (/^(.)\1+$/.test(pw) || /^(password|123456|qwerty)/i.test(pw)) s = 0;
  return Math.min(4, s);
}
var RULES = {
  email: (v) => {
    const s = suggestEmail(v);
    if (!EMAIL.test(v)) return s ? { code: "email", suggestion: s } : "email";
    return { code: "", suggestion: s || void 0, value: v.toLowerCase() };
  },
  phone: (v, arg, { opts }) => {
    const p = parsePhone(v, arg || opts.country || "AL");
    return p ? { code: "", value: p.e164 } : "phone";
  },
  url: (v) => {
    const s = /^[a-z][a-z\d+.-]*:/i.test(v) ? v : "https://" + v;
    try {
      const u = new URL(s);
      return /^https?:$/.test(u.protocol) && /\.[a-z]{2,}$/i.test(u.hostname) ? { code: "", value: u.href } : "url";
    } catch {
      return "url";
    }
  },
  minlength: (v, n) => [...v].length >= Number(n) ? true : "minlength",
  maxlength: (v, n) => [...v].length <= Number(n) ? true : "maxlength",
  number: (v) => /^-?\d+(?:[.,]\d+)?$/.test(v) ? { code: "", value: v.replace(",", ".") } : "number",
  integer: (v) => /^-?\d+$/.test(v) ? true : "integer",
  min: (v, n) => Number(v.replace(",", ".")) >= Number(n) ? true : "min",
  max: (v, n) => Number(v.replace(",", ".")) <= Number(n) ? true : "max",
  pattern: (v, re) => {
    try {
      return new RegExp(`^(?:${re})$`, "u").test(v) ? true : "pattern";
    } catch {
      return true;
    }
  },
  match: (v, other, { values }) => v === (values[other || ""] ?? "") ? true : "match",
  password: (v) => v.length >= 8 && /\p{L}/u.test(v) && /\d/.test(v) ? true : "password",
  name: (v) => /^[\p{L}\p{M}][\p{L}\p{M}' .-]{1,99}$/u.test(v) ? { code: "", value: v.replace(/\s+/g, " ") } : "name",
  date: (v) => /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) ? true : "date",
  oneof: (v, list) => (list || "").split("|").includes(v) ? true : "oneof",
  accepted: (v) => /^(on|yes|true|1)$/i.test(v) ? true : "accepted"
};
function addRule(name, fn, messages) {
  RULES[name.toLowerCase()] = fn;
  if (messages) for (const [l, m] of Object.entries(messages)) (MESSAGES[l] ?? (MESSAGES[l] = {}))[name.toLowerCase()] = m;
}
function parseRules(spec) {
  if (Array.isArray(spec)) return spec.flatMap(parseRules);
  const out = [];
  const re = /([\w-]+)(?::("([^"]*)"|\S+))?/g;
  let m;
  while (m = re.exec(spec)) out.push({ name: m[1].toLowerCase(), arg: m[3] ?? m[2] });
  return out;
}
function checkValue(value, rules, values = {}, opts = {}) {
  let v = String(value ?? "").trim();
  const required = rules.some((r) => r.name === "required");
  if (!v) return required ? { value: v, error: { code: "required", message: message("required", opts) } } : { value: v };
  let suggestion;
  for (const r of rules) {
    if (r.name === "required") continue;
    const fn = RULES[r.name];
    if (!fn) continue;
    const res = fn(v, r.arg, { values, opts });
    if (res === true) continue;
    if (typeof res === "string") return { value: v, error: { code: res, message: message(res, opts, { n: r.arg ?? "" }) } };
    if (res.code) {
      const msg = res.suggestion ? message("emailSuggest", opts, { s: res.suggestion }) : message(res.code, opts, { n: r.arg ?? "" });
      return { value: v, error: { code: res.code, message: msg, suggestion: res.suggestion } };
    }
    if (res.value !== void 0) v = res.value;
    if (res.suggestion) suggestion = res.suggestion;
  }
  return { value: v, suggestion };
}
function readInput(input) {
  const out = {};
  const put = (k, v) => {
    const s = typeof v === "string" ? v : v == null ? "" : typeof v === "object" && "name" in v ? "" : String(v);
    if (k in out) out[k] = [].concat(out[k], s);
    else out[k] = s;
  };
  if (typeof input.forEach === "function" && typeof input.get === "function") {
    input.forEach((v, k) => put(k, v));
  } else {
    for (const [k, v] of Object.entries(input)) {
      if (Array.isArray(v)) v.forEach((x) => put(k, x));
      else put(k, v);
    }
  }
  return out;
}
function schema(fields, defaults = {}) {
  const parsed = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, parseRules(v)]));
  return {
    fields: parsed,
    validate: (input, opts = {}) => validate(parsed, input, { ...defaults, ...opts })
  };
}
function validate(fields, input, opts = {}) {
  const raw = readInput(input);
  const flat = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  const data = {};
  const errors = {};
  if (opts.spam) {
    const ts = Number(flat._ts);
    const age = (opts.now ?? Date.now()) - ts;
    if ((flat._hp ?? "") !== "" || !ts || age < 1500 || age > 864e5) {
      errors._form = { code: "spam", message: message("spam", opts) };
      return { ok: false, data, errors };
    }
  }
  for (const [name, spec] of Object.entries(fields)) {
    const rules = typeof spec === "string" ? parseRules(spec) : spec;
    const value = raw[name];
    if (Array.isArray(value)) {
      const cleaned = [];
      for (const v of value) {
        const r = checkValue(v, rules, flat, opts);
        if (r.error && !errors[name]) errors[name] = r.error;
        cleaned.push(r.value);
      }
      data[name] = cleaned;
    } else {
      const r = checkValue(value ?? "", rules, flat, opts);
      if (r.error) errors[name] = r.error;
      data[name] = r.value;
    }
  }
  return { ok: Object.keys(errors).length === 0, data, errors };
}

export {
  message,
  distance,
  suggestEmail,
  parsePhone,
  passwordScore,
  addRule,
  parseRules,
  checkValue,
  schema,
  validate,
  core_exports
};
