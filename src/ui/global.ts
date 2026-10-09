/** <script> build of lumafx/ui: window.lumafx.ui plus the <fx-ui> element. */
import * as ui from './index';

const w = window as unknown as { lumafx?: Record<string, unknown> };
w.lumafx = w.lumafx || {};
w.lumafx.ui = ui;
