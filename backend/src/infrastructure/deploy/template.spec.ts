import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static checks of the CloudFormation template (infra/template.yaml).
 * The template uses CloudFormation tags (!Sub, !Ref…) that generic YAML parsers reject,
 * so resources are read as indentation-delimited text blocks.
 */
const template = readFileSync(
  join(__dirname, '../../../../infra/template.yaml'),
  'utf8',
);

const section = (name: string): string => {
  const start = template.indexOf(`\n${name}:\n`);
  if (start < 0) throw new Error(`section ${name} not found`);
  const rest = template.slice(start + name.length + 3);
  const end = rest.search(/\n[A-Za-z]+:\n/);
  return end < 0 ? rest : rest.slice(0, end);
};

const resource = (logicalId: string): string => {
  const resources = section('Resources');
  const start = resources.indexOf(`\n  ${logicalId}:\n`);
  if (start < 0) throw new Error(`resource ${logicalId} not found`);
  const rest = resources.slice(start + logicalId.length + 4);
  const end = rest.search(/\n {2}[A-Za-z0-9]+:\n/);
  return end < 0 ? rest : rest.slice(0, end);
};

const parameter = (name: string): string => {
  const params = section('Parameters');
  const start = params.indexOf(`\n  ${name}:\n`);
  if (start < 0) throw new Error(`parameter ${name} not found`);
  const rest = params.slice(start + name.length + 4);
  const end = rest.search(/\n {2}[A-Za-z0-9]+:\n/);
  return end < 0 ? rest : rest.slice(0, end);
};

describe('infra/template.yaml', () => {
  it('AC-006-07 serves the SPA from a private S3 bucket only through CloudFront OAC, HTTPS and SPA fallback', () => {
    const bucket = resource('FrontendBucket');
    expect(bucket).toContain('Type: AWS::S3::Bucket');
    for (const flag of [
      'BlockPublicAcls',
      'BlockPublicPolicy',
      'IgnorePublicAcls',
      'RestrictPublicBuckets',
    ]) {
      expect(bucket).toMatch(new RegExp(`${flag}: true`));
    }

    const oac = resource('FrontendOac');
    expect(oac).toContain('Type: AWS::CloudFront::OriginAccessControl');
    expect(oac).toContain('SigningBehavior: always');

    const distribution = resource('Distribution');
    expect(distribution).toContain('OriginAccessControlId: !Ref FrontendOac');
    expect(distribution).toContain('ViewerProtocolPolicy: redirect-to-https');
    expect(distribution).toMatch(
      /ErrorCode: 403, ResponseCode: 200, ResponsePagePath: \/index\.html/,
    );
    expect(distribution).toMatch(
      /ErrorCode: 404, ResponseCode: 200, ResponsePagePath: \/index\.html/,
    );

    const policy = resource('FrontendBucketPolicy');
    expect(policy).toContain('Service: cloudfront.amazonaws.com');
    expect(policy).toContain('AWS:SourceArn');
    expect(policy).toContain('distribution/${Distribution}');
  });

  it('AC-006-08 CloudFront adds HSTS, CSP, frame, nosniff and referrer security headers', () => {
    const headers = resource('SecurityHeadersPolicy');
    expect(headers).toMatch(/StrictTransportSecurity:[\s\S]*Preload: true/);
    expect(headers).toMatch(/ContentTypeOptions: \{ Override: true \}/);
    expect(headers).toMatch(/FrameOption: DENY/);
    expect(headers).toMatch(/ReferrerPolicy: strict-origin-when-cross-origin/);
    expect(headers).toMatch(/default-src 'self'/);
    expect(headers).toMatch(
      /connect-src 'self' https:\/\/\$\{HttpApi\}\.execute-api\.\$\{AWS::Region\}\.amazonaws\.com/,
    );
    expect(headers).toMatch(/frame-ancestors 'none'/);
    expect(headers).toMatch(/object-src 'none'/);
    expect(resource('Distribution')).toContain(
      'ResponseHeadersPolicyId: !Ref SecurityHeadersPolicy',
    );
  });

  it('AC-006-09 the Lambda runs outside a VPC on arm64, secrets are NoEcho and CORS comes from CloudFront', () => {
    const fn = resource('ApiFunction');
    expect(fn).toContain('Type: AWS::Lambda::Function');
    expect(fn).not.toContain('VpcConfig');
    expect(fn).toContain('Architectures: [arm64]');
    expect(fn).toContain(
      "CORS_ORIGINS: !Sub 'https://${Distribution.DomainName}'",
    );

    for (const secret of [
      'DatabaseUrl',
      'GatewayPrivateKey',
      'GatewayIntegritySecret',
      'GatewayEventsSecret',
    ]) {
      expect(parameter(secret)).toContain('NoEcho: true');
    }
    // No literal secrets in the template: every sensitive value is a parameter reference.
    expect(fn).toContain('DATABASE_URL: !Ref DatabaseUrl');
    expect(fn).toContain('GATEWAY_PRIVATE_KEY: !Ref GatewayPrivateKey');
    expect(template).not.toMatch(/prv_(test|prod)_|postgres(ql)?:\/\//);
  });
});
