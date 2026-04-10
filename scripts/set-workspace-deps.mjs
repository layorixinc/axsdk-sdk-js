import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
  if (!pkg[depType]) continue;
  for (const name of Object.keys(pkg[depType])) {
    if (name.startsWith('@axsdk/')) {
      pkg[depType][name] = 'workspace:*';
    }
  }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Updated ${pkg.name}: @axsdk/* deps set to workspace:*`);
