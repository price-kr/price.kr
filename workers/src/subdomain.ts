import punycode from "punycode";

export function extractSubdomain(
  host: string,
  mainDomain: string
): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(":")[0];

  if (hostWithoutPort === mainDomain) return null;

  const suffix = `.${mainDomain}`;
  if (!hostWithoutPort.endsWith(suffix)) return null;

  const sub = hostWithoutPort.slice(0, -suffix.length);

  // Decode punycode using well-tested npm package
  // Note: toUnicode is lenient — returns original string if decoding fails
  // Invalid subdomains will simply miss in KV lookup → redirect to web app
  const decoded = punycode.toUnicode(sub);

  // Reject www and multi-level subdomains (check after decode to catch Unicode dot separators)
  if (decoded === "www" || decoded.includes(".")) return null;

  return decoded;
}
