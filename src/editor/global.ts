/** <script> build of lumafx/editor: adds window.lumafx.editor and registers <fx-panel>. */
import * as editor from './index';

const w = window as unknown as { lumafx?: Record<string, unknown> };
w.lumafx = w.lumafx || {};
w.lumafx.editor = editor;
