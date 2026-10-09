/**
 * React / Next.js bindings. These components only render plain elements with
 * data-fx attributes, so they work in Server Components with zero client JS.
 * Add <FxRuntime /> once (e.g. in app/layout.tsx) to run the JS-powered effects.
 */
import { type ElementType, type ReactNode } from 'react';
type OptionValue = string | number | boolean | null | undefined;
export interface FxProps {
    /** Element or component to render. Default: div. */
    as?: ElementType;
    /** One or more effect names, e.g. "border-beam" or ["tilt", "spotlight"]. */
    effect?: string | string[];
    /** Effect options, e.g. { duration: '4s', color: '#a78bfa' }. */
    options?: Record<string, OptionValue>;
    children?: ReactNode;
    [prop: string]: unknown;
}
/** Generic wrapper: <Fx effect="tilt" options={{ max: 8 }}>…</Fx> */
export declare function Fx({ as, effect, options, ...rest }: FxProps): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
type Named = {
    as?: ElementType;
    children?: ReactNode;
    className?: string;
} & Record<string, unknown>;
export declare const BorderBeam: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Shimmer: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Shine: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Aurora: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Squircle: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Glass: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Shadow: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Reveal: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Stagger: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Scramble: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Counter: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Spotlight: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Magnetic: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Tilt: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const CursorImage: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Parallax: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Stack: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Carousel: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Stories: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Ripple: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Morph: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Text effects split the DOM, so the element is re-created whenever the text changes. */
export declare function TextReveal(props: Named): import("react").FunctionComponentElement<Named>;
/** Renders the track itself so React keeps owning its children. */
export declare const Marquee: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Renders the sticky wrapper and track itself so React keeps owning its children. */
export declare const HScroll: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Place once, anywhere in the layout. Covers on leave, reveals on arrival. */
export declare const PageTransition: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Preloader: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Renders the panel itself so React keeps owning the content. Open with data-fx-open="#id" or modals.open('#id'). */
export declare const Modal: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Hovercard: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Chat: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const SmartHeader: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Scrollbar: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const ScrollProgress: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Dock: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const HoverIcon: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Lightbox: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const ImageReveal: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Expand: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const ImageTrail: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Renders the sticky wrapper itself so React keeps owning its children. */
export declare const VideoScrub: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Frames: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const SvgDraw: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const DotField: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Typewriter: (props: Named) => import("react").FunctionComponentElement<Named>;
export declare const RotateWords: (props: Named) => import("react").FunctionComponentElement<Named>;
export declare const Clock: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export declare const Dapple: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Renders the track itself so React keeps owning its children. */
export declare const Ring: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Card designs: glow, product, flip, cover, ticket. */
export declare const Card: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Click feedback: ripple, burst, fill, squish. */
export declare const Press: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** A side panel or bottom sheet. Renders the panel itself so React keeps owning the content. */
export declare const Drawer: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Smart form: validation rules from attributes or data-rules, AJAX submit with server errors. */
export declare const Form: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
/** Glossy 3D slabs fanning over a floating plate (WebGL, CSS 3D fallback). */
export declare const Loader3D: {
    ({ as, children, ...rest }: Named): import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>;
    displayName: string;
};
export {};
