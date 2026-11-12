/**
 * Traceability matrix: every acceptance criterion AC-NNN-YY declared in specs/*\/spec.md
 * must appear in the name of at least one test (*.spec.ts(x) / *.test.ts(x)).
 * Prints a Markdown table and exits 1 if any AC has no test.
 *
 *   npx tsx scripts/trace.ts              # all specs
 *   npx tsx scripts/trace.ts --spec 004   # one spec (used by `ship`)
 *   npx tsx scripts/trace.ts --shipped    # only specs whose tasks.md is fully checked (CI)
 *   npx tsx scripts/trace.ts --out f.md   # also write the table to a file
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const AC_RE = /AC-\d{3}-\d{2}/g;
const TEST_RE = /\.(spec|test)\.tsx?$/;
const SKIP = new Set(['node_modules', 'dist', 'coverage', 'generated', '.git']);

export const walk = (dir: string, keep: (p: string) => boolean): string[] => {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
};

export const extractAcs = (text: string): string[] => [...new Set(text.match(AC_RE) ?? [])];

export const buildMatrix = (
  acs: string[],
  tests: { file: string; content: string }[],
): { ac: string; files: string[] }[] =>
  acs.map((ac) => ({ ac, files: tests.filter((t) => t.content.includes(ac)).map((t) => t.file) }));

export const toMarkdown = (rows: { ac: string; files: string[] }[]): string =>
  [
    '| AC | Archivo | Estado |',
    '|---|---|---|',
    ...rows.map(
      (r) => `| ${r.ac} | ${r.files.length ? r.files.join('<br>') : '—'} | ${r.files.length ? '✅' : '❌'} |`,
    ),
  ].join('\n');

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

/** A spec is shipped when its tasks.md exists and has no unchecked task. */
export const isShipped = (tasksMd: string): boolean => !/- \[ \]/.test(tasksMd);

const main = (): void => {
  const specsDir = join(ROOT, 'specs');
  const only = arg('--spec');
  const shippedOnly = process.argv.includes('--shipped');
  const specFiles = walk(specsDir, (p) => p.endsWith('spec.md'))
    .filter((f) => !only || basename(dirname(f)).startsWith(only))
    .filter((f) => {
      if (!shippedOnly) return true;
      const tasks = join(dirname(f), 'tasks.md');
      return existsSync(tasks) && isShipped(readFileSync(tasks, 'utf8'));
    })
    .sort();
  if (specFiles.length === 0) console.log(`No hay specs que revisar${only ? ` para ${only}` : ''}.`);
  // A spec may mention another spec's AC (e.g. 011 refers to AC-005-04): count each AC once.
  const acs = [...new Set(specFiles.flatMap((f) => extractAcs(readFileSync(f, 'utf8'))))].sort();

  const tests = ['backend', 'frontend']
    .flatMap((pkg) => walk(join(ROOT, pkg), (p) => TEST_RE.test(p)))
    .map((f) => ({ file: relative(ROOT, f), content: readFileSync(f, 'utf8') }));

  const rows = buildMatrix(acs, tests);
  const md = toMarkdown(rows);
  console.log(md);

  const out = arg('--out');
  if (out) writeFileSync(out, md + '\n');

  const missing = rows.filter((r) => r.files.length === 0);
  console.log(`\n${rows.length - missing.length}/${rows.length} AC con test.`);
  if (missing.length > 0) {
    console.error(`Faltan tests para: ${missing.map((m) => m.ac).join(', ')}`);
    process.exit(1);
  }
};

if (require.main === module) main();
