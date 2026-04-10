import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(__dirname, '..', 'packages');

// Build a map of @axsdk/* package names to their current versions
const versionMap = {};
for (const dir of readdirSync(packagesDir)) {
  try {
    const siblingPkg = JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf-8'));
    if (siblingPkg.name?.startsWith('@axsdk/')) {
      versionMap[siblingPkg.name] = siblingPkg.version;
    }
  } catch {}
}

// Update current package's @axsdk/* deps to use actual versions
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

let updated = [];
for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
  if (!pkg[depType]) continue;
  for (const name of Object.keys(pkg[depType])) {
    if (name.startsWith('@axsdk/') && versionMap[name]) {
      const version = `^${versionMap[name]}`;
      pkg[depType][name] = version;
      updated.push(`${name} -> ${version}`);
    }
  }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
if (updated.length) {
  console.log(`Updated ${pkg.name} deps:\n  ${updated.join('\n  ')}`);
} else {
  console.log(`${pkg.name}: no @axsdk/* deps to update`);
}
