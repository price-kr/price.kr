import { it, expect } from "vitest";
import { execFileSync } from "child_process";

it("should find git executable from within test environment", () => {
  try {
    const gitPath = execFileSync("which", ["git"], { encoding: "utf-8" }).trim();
    console.log(`Git found at: ${gitPath}`);
    expect(gitPath).toContain("/git"); // Check if it contains /git (e.g., /usr/bin/git)

    const version = execFileSync(gitPath, ["--version"], { encoding: "utf-8" }).trim();
    console.log(`Git version: ${version}`);
    expect(version).toContain("git version");
  } catch (error) {
    console.error("Error finding or running git:", error);
    throw error;
  }
});
