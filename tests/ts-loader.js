import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from 'sucrase';

export async function resolve(specifier, context, nextResolve) {
  // Handle relative imports
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    try {
      return await nextResolve(specifier, context);
    } catch (err) {
      if (err.code === 'ERR_MODULE_NOT_FOUND') {
        if (context.parentURL) {
          const parentDir = path.dirname(fileURLToPath(context.parentURL));
          const resolvedPath = path.resolve(parentDir, specifier);
          const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
          for (const ext of extensions) {
            const target = resolvedPath + ext;
            if (fs.existsSync(target)) {
              return nextResolve(pathToFileURL(target).href, context);
            }
          }
        }
      }
      throw err;
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.tsx') || url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    const code = fs.readFileSync(filePath, 'utf-8');
    const compiled = transform(code, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'automatic',
    });
    return {
      format: 'module',
      source: compiled.code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
