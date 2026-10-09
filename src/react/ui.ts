/**
 * lumafx/ui for React and Next.js, Server Component safe: the blocks render to HTML on the server
 * (good for SEO, no layout shift) inside an <fx-ui> element that the browser makes interactive
 * once `lumafx/ui` loads (add <FxUIRuntime /> from "lumafx/react/runtime" once, or the CDN script).
 *
 *   import { FxUI } from 'lumafx/react/ui';
 *   <FxUI doc={{ lang: 'sq', blocks: [...] }} timeZone="Europe/Tirane" />
 */
import { createElement } from 'react';
import { renderToString, type RenderOptions } from '../ui/server';

export interface FxUIProps {
  /** A document ({ blocks }), a list of blocks, one block, or JSON text. */
  doc: unknown;
  /** Label language: en or sq. Default: the document's lang. */
  lang?: string;
  locale?: string;
  /** Time zone for dates, e.g. "Europe/Tirane". Set it on the server so the HTML matches. */
  timeZone?: string;
  /** Where follow-up chips go when no chat handles them, e.g. "/search?q=". */
  askUrl?: string;
  /** Pin "now" for countdowns so server and client agree. */
  now?: number;
  className?: string;
  id?: string;
}

export function FxUI({ doc, lang, locale, timeZone, askUrl, now, className, id }: FxUIProps) {
  const docLang = doc && typeof doc === 'object' && typeof (doc as { lang?: unknown }).lang === 'string' ? (doc as { lang: string }).lang : undefined;
  lang ??= docLang;
  const opts: RenderOptions = { lang, locale, timeZone, now };
  return createElement('fx-ui', {
    className,
    id,
    lang,
    'time-zone': timeZone,
    'ask-url': askUrl,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: renderToString(doc, opts) },
  });
}

export { renderToString, validate, toText, prompt, jsonSchema, anthropicTool, openaiTool } from '../ui/server';
