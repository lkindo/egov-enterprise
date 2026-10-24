// Compile with the repository's installed Tailwind version; no CDN at runtime.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const requireFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url));
const requirePostcssPlugin = createRequire(requireFrontend.resolve('@tailwindcss/postcss'));
const postcss = requirePostcssPlugin('postcss');
const tailwind = requireFrontend('@tailwindcss/postcss');
const input = new URL('./styles.input.css', import.meta.url);
const tailwindPath = requireFrontend.resolve('tailwindcss/index.css').replaceAll('\\', '/');
const css = (await readFile(input, 'utf8')).replace('"tailwindcss"', `"${tailwindPath}"`);
const result = await postcss([tailwind({ optimize: true })]).process(css, { from: fileURLToPath(input) });
await writeFile(new URL('./styles.css', import.meta.url), result.css);
console.log('Compiled migration workspace prototype styles.');
