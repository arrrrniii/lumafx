import type { StartOptions } from 'lumafx';
export declare function FxRuntime(props: StartOptions): null;
/**
 * Loads lumafx/ui in the browser so server-rendered <FxUI> blocks become interactive (tabs, quiz,
 * tickets, live data). Render it once, next to <FxRuntime />.
 */
export declare function FxUIRuntime(): null;
export interface FxUIStreamProps {
    /** What the model has written so far: JSON text (it may be cut off mid-way) or the parsed value. */
    value: unknown;
    /** True once the model has finished: validates strictly and starts live data. */
    done?: boolean;
    lang?: string;
    timeZone?: string;
    className?: string;
    /** A follow-up chip was clicked: send it as the user's next message. */
    onAsk?: (text: string) => void;
    /** A ticket tier or seating zone was picked. */
    onSelect?: (detail: {
        block: string;
        tier?: string;
        zone?: string;
    }) => void;
    /** Validation result when `done` turns true. */
    onDone?: (result: {
        doc: unknown;
        errors: {
            path: string;
            message: string;
        }[];
    }) => void;
}
/**
 * Renders a model's UI while it streams, for chat interfaces:
 *
 *   <FxUIStream value={toolCall.argsText} done={toolCall.state === 'result'} onAsk={sendMessage} />
 */
export declare function FxUIStream({ value, done, lang, timeZone, className, onAsk, onSelect, onDone }: FxUIStreamProps): import("react").DetailedReactHTMLElement<{
    ref: import("react").RefObject<HTMLDivElement | null>;
    className: string | undefined;
}, HTMLDivElement>;
