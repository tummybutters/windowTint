import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  EXPECTED_PROJECT_NAME,
  VercelProjectGuardError,
  verifyProductionVercelTarget
} = require('../lib/vercel-project-guard.js');

function parseArgs(argv) {
  let projectFile;
  for (const arg of argv) {
    if (arg.startsWith('--project-file=')) {
      projectFile = arg.slice('--project-file='.length);
    } else {
      throw new VercelProjectGuardError(
        'Unknown argument. Usage: verify-production-target.mjs [--project-file=<path>]'
      );
    }
  }
  return { projectFile };
}

try {
  const { projectFile } = parseArgs(process.argv.slice(2));
  verifyProductionVercelTarget(projectFile ? { projectFile } : {});
  // Print only the fixed expected project name, never anything read from
  // the file, so a success run cannot leak config contents either.
  console.log(`verify-production-target: OK - local Vercel binding matches production project '${EXPECTED_PROJECT_NAME}'.`);
} catch (error) {
  const message = error && error.safeToDisplay === true ? error.message : 'verification failed.';
  console.error(`verify-production-target: FAILED - ${message}`);
  process.exit(1);
}
