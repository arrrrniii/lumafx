/**
 * lumafx/forms: one rule language for the browser and the server.
 *
 *   <input name="email" data-rules="required email">            (browser, via data-fx="form")
 *   schema({ email: 'required email' }).validate(formData)      (server: Next.js, Node, Edge)
 *
 * No DOM access here, so the same file runs in route handlers and server actions.
 */
export type Locale = 'en' | 'sq';
export interface FieldError {
    code: string;
    message: string;
    /** For email typos: the address the visitor probably meant. */
    suggestion?: string;
}
export interface Result {
    ok: boolean;
    /** Cleaned values: trimmed, emails lower-cased, phone numbers in E.164 (+355691234567). */
    data: Record<string, string | string[]>;
    errors: Record<string, FieldError>;
}
export interface Options {
    /** Message language. Default: en. */
    locale?: Locale | string;
    /** Override or add messages: { required: 'Please fill this in' }. */
    messages?: Record<string, string>;
    /** Default country for phone numbers without +, e.g. "AL". */
    country?: string;
    /** Check the honeypot (_hp must be empty) and the time trap (_ts at least 1.5 s old). */
    spam?: boolean;
    /** Current time, for tests. */
    now?: number;
}
export type RuleFn = (value: string, arg: string | undefined, ctx: {
    values: Record<string, string>;
    opts: Options;
}) => true | string | {
    code: string;
    suggestion?: string;
    value?: string;
};
export declare function message(code: string, opts?: Options, vars?: Record<string, string>): string;
/** Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps), capped for speed. */
export declare function distance(a: string, b: string): number;
/** "arni@gmial.con" → "arni@gmail.com". Returns null when the address looks fine. */
export declare function suggestEmail(email: string): string | null;
export interface Phone {
    /** +355691234567 */
    e164: string;
    /** +355 69 123 4567 */
    international: string;
    callingCode: string;
    national: string;
}
/** Parses a phone number typed in any common way. Returns null when it can't be a real number. */
export declare function parsePhone(input: string, country?: string): Phone | null;
/** 0 (weak) … 4 (strong). */
export declare function passwordScore(pw: string): number;
/** Adds a rule usable everywhere: addRule('nipt', v => /^[A-Z]\d{8}[A-Z]$/.test(v) || 'nipt'). */
export declare function addRule(name: string, fn: RuleFn, messages?: Partial<Record<Locale, string>>): void;
export interface ParsedRule {
    name: string;
    arg?: string;
}
/** "required email minlength:3 phone:IT" → rules. A pattern may contain spaces when quoted: pattern:"[A-Z]{2} \d+". */
export declare function parseRules(spec: string | string[]): ParsedRule[];
/** Validates one value. Returns the cleaned value, or an error. */
export declare function checkValue(value: string, rules: ParsedRule[], values?: Record<string, string>, opts?: Options): {
    value: string;
    error?: FieldError;
    suggestion?: string;
};
type Input = FormData | URLSearchParams | Record<string, unknown>;
export interface Schema {
    fields: Record<string, ParsedRule[]>;
    validate(input: Input, opts?: Options): Result;
}
/**
 * A reusable form definition, written once and used on both sides:
 *
 *   export const contact = schema({ name: 'required name', email: 'required email', phone: 'phone:AL' });
 *   // app/api/contact/route.ts
 *   const r = contact.validate(await req.formData(), { spam: true });
 *   if (!r.ok) return Response.json({ errors: r.errors }, { status: 422 });
 */
export declare function schema(fields: Record<string, string | string[]>, defaults?: Options): Schema;
/** Validates everything at once (server side, or the browser before sending). */
export declare function validate(fields: Record<string, ParsedRule[] | string>, input: Input, opts?: Options): Result;
export {};
