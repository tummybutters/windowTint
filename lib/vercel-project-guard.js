'use strict';

// Read-only, fail-closed guard against the wrong Vercel project. It never
// writes to .vercel/project.json, never shells out to the vercel CLI, and
// never relinks or deploys anything. Every failure message is a fixed,
// secret-safe string -- it never echoes the file's actual contents, the
// wrong projectId/projectName it read, or the file path.

const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_PROJECT_ID = 'prj_mGo067aGnOyc2v4HCoPhPPBHXEfI';
const EXPECTED_PROJECT_NAME = 'obsidianautoworks';
const DEFAULT_PROJECT_FILE = path.join('.vercel', 'project.json');

class VercelProjectGuardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VercelProjectGuardError';
    this.safeToDisplay = true;
  }
}

function readProjectFile(projectFilePath) {
  let raw;
  try {
    raw = fs.readFileSync(projectFilePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new VercelProjectGuardError(
        'Vercel project file not found. Refusing to proceed without an explicit, verified production link.'
      );
    }
    throw new VercelProjectGuardError('Vercel project file could not be read.');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new VercelProjectGuardError('Vercel project file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new VercelProjectGuardError('Vercel project file has an unrecognized shape.');
  }

  return parsed;
}

function verifyProjectIdentity(project) {
  const projectId = project && typeof project.projectId === 'string' ? project.projectId : null;
  const projectName = project && typeof project.projectName === 'string' ? project.projectName : null;

  if (!projectId || !projectName) {
    throw new VercelProjectGuardError('Vercel project file is missing projectId or projectName.');
  }

  if (projectId !== EXPECTED_PROJECT_ID || projectName !== EXPECTED_PROJECT_NAME) {
    throw new VercelProjectGuardError(
      'Vercel project does not match the approved production target. Refusing to proceed.'
    );
  }

  return { projectId, projectName };
}

function verifyProductionVercelTarget(options = {}) {
  const projectFilePath = options.projectFile || DEFAULT_PROJECT_FILE;
  const project = readProjectFile(projectFilePath);
  return verifyProjectIdentity(project);
}

module.exports = {
  EXPECTED_PROJECT_ID,
  EXPECTED_PROJECT_NAME,
  DEFAULT_PROJECT_FILE,
  VercelProjectGuardError,
  readProjectFile,
  verifyProjectIdentity,
  verifyProductionVercelTarget
};
