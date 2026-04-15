#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

// Publish order (dependency order: core first, then react, then browser)
const PUBLISH_ORDER = ['axsdk-core', 'axsdk-react', 'axsdk-browser'];

const bumpType = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`Usage: node scripts/bump-and-publish.mjs [patch|minor|major]`);
  console.error(`  Default: patch`);
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
  }
}

// 1. Read all package.json files and bump versions
const packages = {};
for (const dir of PUBLISH_ORDER) {
  const pkgPath = join(packagesDir, dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const oldVersion = pkg.version;
  const newVersion = bumpVersion(oldVersion, bumpType);
  pkg.version = newVersion;
  packages[dir] = { pkgPath, pkg, oldVersion, newVersion };
  console.log(`${pkg.name}: ${oldVersion} -> ${newVersion}`);
}

// 2. Build version map for cross-dependency updates
const versionMap = {};
for (const dir of PUBLISH_ORDER) {
  versionMap[packages[dir].pkg.name] = packages[dir].newVersion;
}

// 3. Write bumped versions with workspace:* deps (pre-build state)
for (const dir of PUBLISH_ORDER) {
  const { pkg, pkgPath } = packages[dir];
  for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[depType]) continue;
    for (const name of Object.keys(pkg[depType])) {
      if (name.startsWith('@axsdk/') && versionMap[name]) {
        pkg[depType][name] = 'workspace:*';
      }
    }
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

if (dryRun) {
  console.log('\n--dry-run: versions bumped with workspace:* deps, skipping build & publish');
  process.exit(0);
}

// 4. For each package: build (with workspace:*), swap to versions, publish
console.log('\n--- Build & Publish ---\n');
for (const dir of PUBLISH_ORDER) {
  const { pkg, pkgPath, newVersion } = packages[dir];
  const cwd = join(packagesDir, dir);
  try {
    console.log(`\n[${pkg.name}@${newVersion}] Building (workspace:* deps)...`);
    execSync('bun run build', { cwd, stdio: 'inherit' });

    console.log(`[${pkg.name}@${newVersion}] Swapping workspace:* -> versioned deps...`);
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
      if (!pkg[depType]) continue;
      for (const name of Object.keys(pkg[depType])) {
        if (name.startsWith('@axsdk/') && versionMap[name]) {
          pkg[depType][name] = `^${versionMap[name]}`;
        }
      }
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

    console.log(`[${pkg.name}@${newVersion}] Publishing...`);
    execSync('npm publish --access=public', { cwd, stdio: 'inherit' });
    console.log(`[${pkg.name}@${newVersion}] Published!`);
  } catch (e) {
    console.error(`\nFailed at ${pkg.name}. Stopping.`);
    process.exit(1);
  }
}

// 5. Restore workspace:* deps for local dev
console.log('\n--- Restoring workspace deps ---\n');
for (const dir of PUBLISH_ORDER) {
  const cwd = join(packagesDir, dir);
  execSync('node ../../scripts/set-workspace-deps.mjs', { cwd, stdio: 'inherit' });
}

console.log('\nAll packages published successfully!');
