import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = pathToFileURL(`${process.cwd()}/`).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/types') {
    return nextResolve(`${root}src/types/index.ts`, context);
  }

  if (specifier.startsWith('.') && !path.extname(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // fall through
    }
  }

  return nextResolve(specifier, context);
}
