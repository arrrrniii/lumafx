import type { Effect } from '../core/types';
export interface FormApi {
    /** Validates every field and shows the errors. */
    validate(): boolean;
    /** Current values by field name. */
    values(): Record<string, string>;
    /** Shows errors returned by your server: { email: 'Already registered' } or { email: { message } }. */
    showErrors(errors: Record<string, string | {
        message: string;
    }>): void;
}
export declare const form: Effect;
