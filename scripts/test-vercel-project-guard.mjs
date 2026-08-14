import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const guardModule = require('../lib/vercel-project-guard.js');

const {
  EXPECTED_PROJECT_ID,
  EXPECTED_PROJECT_NAME,
  VercelProjectGuardError,
  readProjectFile,
  verifyProjectIdentity,
  verifyProductionVercelTarget
} = guardModule;

assert.equal(EXPECTED_PROJECT_ID, 'prj_mGo067aGnOyc2v4HCoPhPPBHXEfI');
assert.equal(EXPECTED_PROJECT_NAME, 'obsidianautoworks');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const cliPath = path.join(repoRoot, 'scripts', 'verify-production-target.mjs');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-project-guard-test-'));
const writeFixture = (name, contents) => {
  const filePath = path.join(workDir, name);
  fs.writeFileSync(filePath, contents, 'utf8');
  return filePath;
};

const goodFixture = writeFixture(
  'good.json',
  JSON.stringify({
    projectId: EXPECTED_PROJECT_ID,
    orgId: 'team_kancTfSNeCzD0N5rvypuJ6DZ',
    projectName: EXPECTED_PROJECT_NAME
  })
);

const wrongIdFixture = writeFixture(
  'wrong-id.json',
  JSON.stringify({
    projectId: 'prj_EvuhBoGZhbqjsqjAYugMNnwm50Am',
    orgId: 'team_kancTfSNeCzD0N5rvypuJ6DZ',
    projectName: EXPECTED_PROJECT_NAME
  })
);

const wrongNameFixture = writeFixture(
  'wrong-name.json',
  JSON.stringify({
    projectId: EXPECTED_PROJECT_ID,
    orgId: 'team_kancTfSNeCzD0N5rvypuJ6DZ',
    projectName: 'some-other-project'
  })
);

const missingFieldsFixture = writeFixture('missing-fields.json', JSON.stringify({ orgId: 'team_x' }));

const malformedFixture = writeFixture('malformed.json', '{ this is not json');

const nonexistentFixture = path.join(workDir, 'does-not-exist.json');

// ---------------------------------------------------------------------------
// Library: readProjectFile
// ---------------------------------------------------------------------------

{
  const project = readProjectFile(goodFixture);
  assert.equal(project.projectId, EXPECTED_PROJECT_ID);
  assert.equal(project.projectName, EXPECTED_PROJECT_NAME);
}

assert.throws(() => readProjectFile(nonexistentFixture), VercelProjectGuardError);
assert.throws(() => readProjectFile(malformedFixture), VercelProjectGuardError);

// Malformed JSON error must never echo the raw file content.
try {
  readProjectFile(malformedFixture);
  assert.fail('expected readProjectFile to throw for malformed JSON');
} catch (error) {
  assert.ok(error instanceof VercelProjectGuardError);
  assert.doesNotMatch(error.message, /this is not json/);
}

// ---------------------------------------------------------------------------
// Library: verifyProjectIdentity
// ---------------------------------------------------------------------------

{
  const identity = verifyProjectIdentity({ projectId: EXPECTED_PROJECT_ID, projectName: EXPECTED_PROJECT_NAME });
  assert.deepEqual(identity, { projectId: EXPECTED_PROJECT_ID, projectName: EXPECTED_PROJECT_NAME });
}

assert.throws(
  () => verifyProjectIdentity({ projectId: 'prj_EvuhBoGZhbqjsqjAYugMNnwm50Am', projectName: EXPECTED_PROJECT_NAME }),
  VercelProjectGuardError
);
assert.throws(
  () => verifyProjectIdentity({ projectId: EXPECTED_PROJECT_ID, projectName: 'some-other-project' }),
  VercelProjectGuardError
);
assert.throws(() => verifyProjectIdentity({ projectId: EXPECTED_PROJECT_ID }), VercelProjectGuardError);
assert.throws(() => verifyProjectIdentity({ projectName: EXPECTED_PROJECT_NAME }), VercelProjectGuardError);
assert.throws(() => verifyProjectIdentity({}), VercelProjectGuardError);
assert.throws(() => verifyProjectIdentity(null), VercelProjectGuardError);

// Wrong-value errors must never echo the actual wrong projectId/projectName.
try {
  verifyProjectIdentity({ projectId: 'prj_EvuhBoGZhbqjsqjAYugMNnwm50Am', projectName: EXPECTED_PROJECT_NAME });
  assert.fail('expected verifyProjectIdentity to throw for wrong projectId');
} catch (error) {
  assert.doesNotMatch(error.message, /prj_EvuhBoGZhbqjsqjAYugMNnwm50Am/);
}
try {
  verifyProjectIdentity({ projectId: EXPECTED_PROJECT_ID, projectName: 'some-other-project' });
  assert.fail('expected verifyProjectIdentity to throw for wrong projectName');
} catch (error) {
  assert.doesNotMatch(error.message, /some-other-project/);
}

// ---------------------------------------------------------------------------
// Library: verifyProductionVercelTarget (orchestration)
// ---------------------------------------------------------------------------

{
  const identity = verifyProductionVercelTarget({ projectFile: goodFixture });
  assert.deepEqual(identity, { projectId: EXPECTED_PROJECT_ID, projectName: EXPECTED_PROJECT_NAME });
}

assert.throws(() => verifyProductionVercelTarget({ projectFile: wrongIdFixture }), VercelProjectGuardError);
assert.throws(() => verifyProductionVercelTarget({ projectFile: wrongNameFixture }), VercelProjectGuardError);
assert.throws(() => verifyProductionVercelTarget({ projectFile: missingFieldsFixture }), VercelProjectGuardError);
assert.throws(() => verifyProductionVercelTarget({ projectFile: malformedFixture }), VercelProjectGuardError);
assert.throws(() => verifyProductionVercelTarget({ projectFile: nonexistentFixture }), VercelProjectGuardError);

// ---------------------------------------------------------------------------
// Static-shape guarantee: the guard is read-only and can never relink/deploy.
// It must not import child_process or shell out to the vercel CLI at all.
// ---------------------------------------------------------------------------

const guardSource = fs.readFileSync(path.join(repoRoot, 'lib', 'vercel-project-guard.js'), 'utf8');
assert.doesNotMatch(guardSource, /child_process/);
assert.doesNotMatch(guardSource, /\bexec\b/);
assert.doesNotMatch(guardSource, /vercel link/);
assert.doesNotMatch(guardSource, /vercel deploy/);
assert.doesNotMatch(guardSource, /writeFileSync/);
assert.doesNotMatch(guardSource, /fs\.write/);

const cliSource = fs.readFileSync(cliPath, 'utf8');
assert.doesNotMatch(cliSource, /child_process/);
assert.doesNotMatch(cliSource, /\bexec\b/);
assert.doesNotMatch(cliSource, /vercel link/);
assert.doesNotMatch(cliSource, /vercel deploy/);

// ---------------------------------------------------------------------------
// CLI: run as a real subprocess.
// ---------------------------------------------------------------------------

const runCli = (args) => spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' });

{
  const result = runCli([`--project-file=${goodFixture}`]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /OK/);
  assert.doesNotMatch(result.stdout, /team_kancTfSNeCzD0N5rvypuJ6DZ/);
}

{
  const result = runCli([`--project-file=${wrongIdFixture}`]);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /prj_EvuhBoGZhbqjsqjAYugMNnwm50Am/);
  assert.doesNotMatch(result.stdout, /prj_EvuhBoGZhbqjsqjAYugMNnwm50Am/);
}

{
  const result = runCli([`--project-file=${wrongNameFixture}`]);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /some-other-project/);
}

{
  const result = runCli([`--project-file=${malformedFixture}`]);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /this is not json/);
}

{
  const result = runCli([`--project-file=${nonexistentFixture}`]);
  assert.notEqual(result.status, 0);
}

{
  const result = runCli(['--bogus=1']);
  assert.notEqual(result.status, 0);
}

// The known current wrong local binding (this repo's checked-in
// .vercel/project.json points at the separate, failed Thomas-owned project)
// must fail closed by default, with no leaked identifiers.
{
  const result = runCli([]);
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /prj_EvuhBoGZhbqjsqjAYugMNnwm50Am/);
  assert.doesNotMatch(result.stderr, /team_kancTfSNeCzD0N5rvypuJ6DZ/);
  assert.doesNotMatch(result.stdout, /prj_EvuhBoGZhbqjsqjAYugMNnwm50Am/);
}

fs.rmSync(workDir, { recursive: true, force: true });

console.log('vercel project guard test passed');
