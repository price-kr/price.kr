import punycode from "punycode/";

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

  // Decode punycode using the userland module by adding a trailing slash
  let decoded: string;
  try {
    const punycodeInput = sub.toLowerCase();
    decoded = punycode.toUnicode(punycodeInput);
  } catch (e) {
    // If punycode decoding fails, treat the original subdomain as invalid
    console.warn(`Punycode decoding failed for "${sub}":`, e);
    return null;
  }
  
  // Apply toLowerCase() after decoding as well, in case decoding results in mixed case.
  decoded = decoded.toLowerCase();

  // Reject www, empty string, multi-level subdomains, and invalid characters
  // Valid characters for keywords/subdomains: Korean, alphanumeric, hyphen
  const validSubdomainRegex = /^[가-힣a-z0-9]+(?:-[가-힣a-z0-9]+)*$/;

  if (decoded === "www" || decoded === "" || decoded.includes(".") || !validSubdomainRegex.test(decoded)) {
    return null;
  }

  return decoded;
}
