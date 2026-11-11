import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Static checks of the E2E wiring (spec 007): the suite itself runs with Playwright, not Jest.
const root = join(__dirname, '..', '..', '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('E2E setup', () => {
  const ci = read('.github/workflows/ci.yml');
  const e2eJob = ci.slice(ci.indexOf('\n  e2e:'));
  const config = read('frontend/playwright.config.ts');

  it('AC-007-06 the CI has an e2e job that installs the three browsers and runs the suite', () => {
    expect(e2eJob).toContain('\n  e2e:');
    expect(e2eJob).toContain('npx playwright install --with-deps chromium firefox webkit');
    expect(e2eJob).toContain('npm run e2e');
  });

  it('AC-007-06 the HTML report is uploaded as an artifact only when the job fails', () => {
    expect(e2eJob).toMatch(/if: failure\(\)\s+uses: actions\/upload-artifact@v\d+/);
    expect(e2eJob).toContain('frontend/playwright-report/');
  });

  it('AC-007-06 Playwright runs Chromium, Firefox and WebKit at 375×667 against the mocked API', () => {
    for (const name of ['chromium', 'firefox', 'webkit']) expect(config).toContain(`name: '${name}'`);
    expect(config).toContain('viewport: { width: 375, height: 667 }');
    expect(config).toContain("VITE_API_URL: 'http://api.mock'");
  });
});
