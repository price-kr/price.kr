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

  // Reject www and multi-level subdomains
  if (sub === "www" || sub.includes(".")) return null;

  // Decode punycode using well-tested npm package
  // Note: toUnicode is lenient — returns original string if decoding fails
  // Invalid subdomains will simply miss in KV lookup → redirect to web app
  return punycode.toUnicode(sub);
}
