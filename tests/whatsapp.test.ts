import { describe, it, expect } from "vitest";
import { getTemplate, sendWhatsApp } from "@/lib/whatsapp";

describe("WhatsApp mock mode", () => {
  it("newBooking template generates correctly", () => {
    const msg = getTemplate("newBooking", "Lagoon View Loft", "Adaeze O.", "2026-09-15", "2026-09-19", "£960.00");
    expect(msg).toContain("Lagoon View Loft");
    expect(msg).toContain("Adaeze O.");
    expect(msg).toContain("£960.00");
  });

  it("preCheckout template includes guest name", () => {
    const msg = getTemplate("preCheckout", "Sunset Dove", "Chidi O.", "11:00");
    expect(msg).toContain("Sunset Dove");
    expect(msg).toContain("Chidi O.");
  });

  it("sendWhatsApp logs in mock mode", async () => {
    const result = await sendWhatsApp("+2348000000000", "Test message");
    expect(result).toBe(true);
  });
});
