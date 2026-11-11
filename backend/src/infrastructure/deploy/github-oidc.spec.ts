import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static checks of the CD bootstrap (infra/github-oidc.yaml): GitHub may only assume the deploy
 * role from this repo's `production` environment, and that role stays least-privilege.
 * Resources are read as indentation-delimited text blocks (CloudFormation tags break YAML parsers).
 */
const template = readFileSync(
  join(__dirname, '../../../../infra/github-oidc.yaml'),
  'utf8',
);

const resource = (logicalId: string): string => {
  const start = template.indexOf(`\n  ${logicalId}:\n`);
  if (start < 0) throw new Error(`resource ${logicalId} not found`);
  const rest = template.slice(start + logicalId.length + 4);
  const end = rest.search(/\n {2}[A-Za-z0-9]+:\n|\n[A-Za-z]+:\n/);
  return end < 0 ? rest : rest.slice(0, end);
};

describe('infra/github-oidc.yaml', () => {
  const deployRole = resource('GitHubDeployRole');

  it('trusts only the GitHub OIDC provider, audience sts and the production environment of the repo', () => {
    expect(deployRole).toContain('sts:AssumeRoleWithWebIdentity');
    expect(deployRole).toContain(
      'token.actions.githubusercontent.com:aud: sts.amazonaws.com',
    );
    expect(deployRole).toContain(
      "token.actions.githubusercontent.com:sub: !Sub 'repo:${GitHubRepository}:environment:${GitHubEnvironment}'",
    );
    // StringEquals, never StringLike with wildcards on the subject.
    expect(deployRole).not.toContain('StringLike');
    expect(template).toMatch(
      /GitHubEnvironment:\n\s+Type: String\n\s+Default: production/,
    );
  });

  it('gives the deploy role no wildcard actions and passes only the CloudFormation execution role', () => {
    expect(deployRole).not.toMatch(/Action: ['"]?\*['"]?\s*$/m);
    expect(deployRole).not.toMatch(/Action: \w+:\*/);
    expect(deployRole).toMatch(
      /Action: iam:PassRole\n\s+Resource: !GetAtt CloudFormationExecutionRole\.Arn/,
    );
    expect(deployRole).toContain(
      'iam:PassedToService: cloudformation.amazonaws.com',
    );
    // Stack operations only on the app stack.
    expect(deployRole).toContain(
      "Resource: !Sub 'arn:aws:cloudformation:${AWS::Region}:${AWS::AccountId}:stack/${ProjectName}/*'",
    );
  });

  it('scopes the execution role to project resources and never grants iam:* or admin', () => {
    const execRole = resource('CloudFormationExecutionRole');
    expect(execRole).toContain('Service: cloudformation.amazonaws.com');
    expect(execRole).not.toMatch(/Action: ['"]?\*['"]?\s*$/m);
    expect(execRole).not.toContain('iam:*');
    expect(execRole).not.toContain('AdministratorAccess');
    expect(execRole).toContain(
      "Resource: !Sub 'arn:aws:iam::${AWS::AccountId}:role/${ProjectName}-*'",
    );
  });
});
