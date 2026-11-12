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

  it('AC-008-01 CloudFront adds Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy (same-origin)', () => {
    const headers = resource('SecurityHeadersPolicy');
    expect(headers).toMatch(
      /Header: Cross-Origin-Opener-Policy, Value: same-origin, Override: true/,
    );
    expect(headers).toMatch(
      /Header: Cross-Origin-Resource-Policy, Value: same-origin, Override: true/,
    );
  });

  it('AC-008-02 CloudFront adds a Permissions-Policy that disables unused powerful features', () => {
    expect(resource('SecurityHeadersPolicy')).toMatch(
      /Header: Permissions-Policy, Value: 'camera=\(\), microphone=\(\), geolocation=\(\), usb=\(\), payment=\(\)', Override: true/,
    );
  });

  it('AC-008-03 the new headers keep the AC-006-08 ones and COEP is not declared', () => {
    const headers = resource('SecurityHeadersPolicy');
    expect(headers).toContain('SecurityHeadersConfig:');
    expect(headers).toContain('CustomHeadersConfig:');
    for (const h of [
      'StrictTransportSecurity',
      'ContentTypeOptions',
      'FrameOptions',
      'ReferrerPolicy',
      'ContentSecurityPolicy',
    ])
      expect(headers).toContain(h);
    expect(template).not.toMatch(/Cross-Origin-Embedder-Policy/);
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

describe('infra/template.yaml — observability (spec 010)', () => {
  /** DashboardBody with !Sub placeholders filled, parsed as JSON. */
  const dashboardBody = () => {
    const block = resource('Dashboard');
    const start = block.indexOf('DashboardBody: !Sub |\n');
    const body = block
      .slice(start + 'DashboardBody: !Sub |\n'.length)
      .split('\n')
      .filter((l) => l.startsWith('        ') || l.trim() === '')
      .join('\n')
      .replace('${AlarmLatencyP95Ms}', '15000')
      .replace(/\$\{[^}]+\}/g, 'X');
    return JSON.parse(body) as {
      widgets: { type: string; properties: Record<string, unknown> }[];
    };
  };

  it.each(['APPROVED', 'DECLINED', 'ERROR'])(
    'AC-010-11 metric filter for payment.finalized %s on the Lambda log group (value 1, default 0, own namespace)',
    (status) => {
      const name = `Payments${status.charAt(0)}${status.slice(1).toLowerCase()}Metric`;
      const filter = resource(name);
      expect(filter).toContain('Type: AWS::Logs::MetricFilter');
      expect(filter).toContain('LogGroupName: !Ref ApiFunctionLogGroup');
      expect(filter).toContain(
        `FilterPattern: '{ $.event = "payment.finalized" && $.status = "${status}" }'`,
      );
      expect(filter).toMatch(/MetricNamespace: CheckoutChallenge/);
      expect(filter).toMatch(/MetricValue: '1'/);
      expect(filter).toMatch(/DefaultValue: 0/);
    },
  );

  it('AC-010-12 dashboard: requests, 4xx, 5xx, latency p50/p95, Lambda errors/throttles/duration, payments by status and alarms', () => {
    const { widgets } = dashboardBody();
    const metrics = JSON.stringify(
      widgets.filter((w) => w.type === 'metric').map((w) => w.properties),
    );
    for (const m of ['"Count"', '"4xx"', '"5xx"', '"Latency"']) {
      expect(metrics).toContain(m);
    }
    expect(metrics).toContain('"stat":"p50"');
    expect(metrics).toContain('"stat":"p95"');
    for (const m of ['"Errors"', '"Throttles"', '"Duration"']) {
      expect(metrics).toContain(m);
    }
    for (const m of ['PaymentsApproved', 'PaymentsDeclined', 'PaymentsError']) {
      expect(metrics).toContain(`"CheckoutChallenge","${m}"`);
    }
    const alarms = widgets.find((w) => w.type === 'alarm');
    expect(alarms?.properties.alarms).toHaveLength(2);
    expect(resource('Dashboard')).toContain('${Api5xxAlarm.Arn}');
    expect(resource('Dashboard')).toContain('${ApiLatencyP95Alarm.Arn}');
    expect(widgets.some((w) => w.type === 'log')).toBe(true);
  });

  it('AC-010-13 alarms on HTTP API 5xx and p95 latency, parameterized and notBreaching without data', () => {
    const errors = resource('Api5xxAlarm');
    expect(errors).toContain('Type: AWS::CloudWatch::Alarm');
    expect(errors).toContain('MetricName: 5xx');
    expect(errors).toContain('Threshold: !Ref Alarm5xxThreshold');
    expect(errors).toContain('TreatMissingData: notBreaching');

    const latency = resource('ApiLatencyP95Alarm');
    expect(latency).toContain('MetricName: Latency');
    expect(latency).toContain('ExtendedStatistic: p95');
    expect(latency).toContain('Threshold: !Ref AlarmLatencyP95Ms');
    expect(latency).toContain('TreatMissingData: notBreaching');
    expect(parameter('AlarmLatencyP95Ms')).toContain('Default: 15000');
    expect(parameter('Alarm5xxThreshold')).toContain('Default: 5');
    // Decision: no notifications (no SNS topic, no alarm actions).
    expect(template).not.toContain('AlarmActions');
    expect(template).not.toContain('AWS::SNS::Topic');
  });

  it('AC-010-14 X-Ray active on the Lambda with write permission, LOG_LEVEL set and the dashboard URL as output', () => {
    expect(resource('ApiFunction')).toMatch(/TracingConfig:\n\s+Mode: Active/);
    expect(resource('ApiFunctionRole')).toContain(
      'arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess',
    );
    expect(resource('ApiFunction')).toContain('LOG_LEVEL: !Ref LogLevel');
    expect(section('Outputs')).toContain('DashboardUrl:');
    expect(section('Outputs')).toContain('#dashboards:name=${Dashboard}');
  });
});
