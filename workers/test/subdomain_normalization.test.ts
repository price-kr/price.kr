import { describe, it, expect } from 'vitest';
import { extractSubdomain } from '../src/subdomain';

describe('subdomain extraction and normalization', () => {
  it('normalizes mixed case subdomains to lowercase', () => {
    // Test with a standard subdomain
    const host = 'IPHONE.가격.kr';
    const sub = extractSubdomain(host, '가격.kr');
    expect(sub).toBe('iphone');
  });

  it('correctly decodes standard Punycode IDN (한글) to lowercase', () => {
    // 만두.가격.kr -> correct punycode: xn--hu1b07h.가격.kr
    // This test uses the verified correct punycode for '만두'.
    const host = 'xn--hu1b07h.가격.kr';
    const sub = extractSubdomain(host, '가격.kr');
    // The function applies .toLowerCase() after decoding.
    expect(sub).toBe('만두');
  });

  it('handles mixed case Punycode IDN and decodes to lowercase', () => {
    // Mixed case of the correct punycode for '만두'
    const host = 'XN--HU1B07H.가격.kr';
    const sub = extractSubdomain(host, '가격.kr');
    // Expecting lowercase '만두' after decoding and normalization.
    expect(sub).toBe('만두');
  });

  it('rejects multi-level subdomains', () => {
    const host = 'a.b.가격.kr';
    const sub = extractSubdomain(host, '가격.kr');
    expect(sub).toBeNull();
  });

  it('rejects invalid subdomains (e.g., empty string, www, or invalid chars)', () => {
    // Test with an empty subdomain
    const hostEmpty = '.가격.kr'; // After stripping suffix, sub would be empty
    expect(extractSubdomain(hostEmpty, '가격.kr')).toBeNull();

    // Test with www subdomain
    const hostWww = 'www.가격.kr';
    expect(extractSubdomain(hostWww, '가격.kr')).toBeNull();

    // Test with characters not allowed in keywords/subdomains (e.g., numbers, special chars beyond hyphen)
    // Note: this assumes 'invalid-subdomain' itself is not a valid keyword format
    const hostInvalidChars = 'invalid-subdomain!.가격.kr'; // Contains '!'
    expect(extractSubdomain(hostInvalidChars, '가격.kr')).toBeNull();
    
    // Test with a subdomain that is valid punycode but not a valid keyword format (e.g., contains underscores, or is too long if limits exist)
    const hostInvalidKeyword = 'a_b.가격.kr'; // Underscore is not allowed by regex
    expect(extractSubdomain(hostInvalidKeyword, '가격.kr')).toBeNull();
  });

  it('handles main domain request correctly', () => {
    const host = '가격.kr';
    const sub = extractSubdomain(host, '가격.kr');
    expect(sub).toBeNull();
  });

  it('handles www subdomain correctly', () => {
    const host = 'www.가격.kr';
    const sub = extractSubdomain(host, '가격.kr');
    expect(sub).toBeNull();
  });
});
