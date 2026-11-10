// Removes from <dir>/node_modules every package not reachable from package.json
// `dependencies` through `dependencies`/`optionalDependencies` (peer deps are not followed).
// Usage: node scripts/prune-peers.cjs <dir>
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2]);
const nm = path.join(root, 'node_modules');
const keep = new Set(); // absolute package dirs

const resolveFrom = (fromDir, name) => {
  for (let d = fromDir; d.startsWith(root); d = path.dirname(d)) {
    const candidate = path.join(d, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (d === root) break;
  }
  return null;
};

const visit = (pkgDir) => {
  if (keep.has(pkgDir)) return;
  keep.add(pkgDir);
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) {
    const dep = resolveFrom(pkgDir, name);
    if (dep) visit(dep);
  }
};

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const name of Object.keys(rootPkg.dependencies ?? {})) {
  const dep = resolveFrom(root, name);
  if (!dep) throw new Error(`missing dependency ${name}`);
  visit(dep);
}

let removed = 0;
const sweep = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (entry.startsWith('@')) { sweep(full); if (fs.readdirSync(full).length === 0) fs.rmdirSync(full); continue; }
    if (!keep.has(full)) { fs.rmSync(full, { recursive: true, force: true }); removed++; continue; }
    sweep(path.join(full, 'node_modules'));
  }
};
sweep(nm);
console.log(`  pruned ${removed} unreachable packages, kept ${keep.size}`);
