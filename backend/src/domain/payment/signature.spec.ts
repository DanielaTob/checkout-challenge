import { integritySignature } from './signature';

describe('integritySignature', () => {
  it('AC-004-06 is the hex sha256 of reference + amount + currency + secret (known vector)', () => {
    // printf '%s' "sk8-438k4-xmxm39225000000COPtest_integrity_secret" | shasum -a 256
    expect(
      integritySignature(
        'sk8-438k4-xmxm392',
        25000000,
        'COP',
        'test_integrity_secret',
      ),
    ).toBe('308814f6db567338273a5bd359c1fd8731f5cef0a93fb0b200119c8c38b05960');
  });
});
