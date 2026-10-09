/** CDN / <script> build: exposes window.lumafx and starts automatically (opt out with data-fx-manual on the script tag). */
import lumafx from './index';
declare global {
    interface Window {
        lumafx: typeof lumafx;
    }
}
