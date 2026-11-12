import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static checks of the CD identity (infra/ci-deployer.yaml, ADR 0005): the dedicated IAM user
 * stays least-privilege and cannot manage its own keys, and the CloudFormation execution role
 * is scoped to the project. Resources are read as indentation-delimited text blocks
 * (CloudFormation tags break generic YAML parsers).
 */
const template = readFileSync(
  join(__dirname, '../../../../infra/ci-deployer.yaml'),
  'utf8',
);

const resource = (logicalId: string): string => {
  const start = template.indexOf(`\n  ${logicalId}:\n`);
  if (start < 0) throw new Error(`resource ${logicalId} not found`);
  const rest = template.slice(start + logicalId.length + 4);
  const end = rest.search(/\n {2}[A-Za-z0-9]+:\n|\n[A-Za-z]+:\n/);
  return end < 0 ? rest : rest.slice(0, end);
};

describe('infra/ci-deployer.yaml', () => {
  it('creates the dedicated checkout-ci-deployer user with only the CD policy and no keys or console login', () => {
    const user = resource('CiDeployerUser');
    expect(user).toContain('Type: AWS::IAM::User');
    expect(user).toContain('UserName: checkout-ci-deployer');
    expect(user).toContain('ManagedPolicyArns: [!Ref CiDeployerPolicy]');
    // Keys are created by hand in the console, never in the template (no secret in outputs).
    expect(template).not.toContain('AWS::IAM::AccessKey');
    expect(template).not.toContain('LoginProfile:');
  });

  it('gives the user no wildcard actions and passes only the CloudFormation execution role', () => {
    const policy = resource('CiDeployerPolicy');
    expect(policy).not.toMatch(/Action: ['"]?\*['"]?\s*$/m);
    expect(policy).not.toMatch(/Effect: Allow\n\s+Action: \w+:\*/);
    expect(policy).toMatch(
      /Action: iam:PassRole\n\s+Resource: !GetAtt CloudFormationExecutionRole\.Arn/,
    );
    expect(policy).toContain(
      'iam:PassedToService: cloudformation.amazonaws.com',
    );
    // Stack operations only on the app stack.
    expect(policy).toContain(
      "Resource: !Sub 'arn:aws:cloudformation:${AWS::Region}:${AWS::AccountId}:stack/${ProjectName}/*'",
    );
    // The user cannot mint or rotate its own keys, nor widen its own permissions.
    expect(policy).toMatch(
      /Effect: Deny\n\s+Action:\n\s+- iam:CreateAccessKey\n\s+- iam:UpdateAccessKey\n\s+- iam:DeleteAccessKey/,
    );
    expect(policy).toContain('- iam:AttachUserPolicy');
    expect(policy).toContain('- iam:PutUserPolicy');
  });

  it('scopes the execution role to project resources, never allows iam:* or admin, and cannot touch the CD identities', () => {
    const execRole = resource('CloudFormationExecutionRole');
    expect(execRole).toContain('Service: cloudformation.amazonaws.com');
    expect(execRole).not.toMatch(/Action: ['"]?\*['"]?\s*$/m);
    expect(execRole).not.toMatch(/Effect: Allow\n\s+Action: iam:\*/);
    expect(execRole).not.toContain('AdministratorAccess');
    expect(execRole).not.toContain('cloudfront:*');
    expect(execRole).toContain(
      "Resource: !Sub 'arn:aws:iam::${AWS::AccountId}:role/${ProjectName}-*'",
    );
    expect(execRole).toMatch(
      /Effect: Deny\n\s+Action: iam:\*\n\s+Resource:\n\s+- !Sub 'arn:aws:iam::\$\{AWS::AccountId\}:role\/\$\{ProjectName\}-cfn-exec'\n\s+- !Sub 'arn:aws:iam::\$\{AWS::AccountId\}:user\/checkout-ci-deployer'/,
    );
    expect(execRole).toMatch(
      /Action: iam:AttachRolePolicy\n[\s\S]*?ArnEquals:/,
    );
  });

  it('never takes CORS_ORIGINS from GitHub: production CORS comes from the CloudFront domain in the template', () => {
    const workflow = readFileSync(
      join(__dirname, '../../../../.github/workflows/deploy.yml'),
      'utf8',
    );
    const deployScript = readFileSync(
      join(__dirname, '../../../../scripts/deploy.sh'),
      'utf8',
    );
    expect(workflow).not.toContain('CORS_ORIGINS');
    expect(deployScript).not.toMatch(/CorsOrigins|CORS_ORIGINS=/);
  });

  it('has no OIDC provider (denied by the account SCP, ADR 0005)', () => {
    expect(template).not.toContain('AWS::IAM::OIDCProvider');
  });
});
