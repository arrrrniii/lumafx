/** CDN / <script> build: exposes window.lumafx and starts automatically (opt out with data-fx-manual on the script tag). */
import lumafx, { start } from './index';

declare global {
  interface Window {
    lumafx: typeof lumafx;
  }
}

if (typeof window !== 'undefined') {
  window.lumafx = lumafx;
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script?.hasAttribute('data-fx-manual')) {
    // Running in <head> without defer: mark the page now so reveals don't flash.
    document.documentElement.classList.add('fx-ready');
    start();
  }
}
