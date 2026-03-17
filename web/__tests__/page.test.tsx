import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("renders privacy policy heading", () => {
    render(<PrivacyPage />);
    expect(screen.getByText("개인정보처리방침")).toBeDefined();
  });

  it("states no PII is collected", () => {
    render(<PrivacyPage />);
    expect(screen.getAllByText(/개인 식별 정보/).length).toBeGreaterThan(0);
  });
});
