/** Side-effect entry: `import 'lumafx/auto'` registers every effect and starts the runtime. */
import { start } from './index';

start();

export * from './index';
export { default } from './index';
