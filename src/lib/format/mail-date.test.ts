import { describe, expect, it } from "vitest";
import { compactMailDate, mailDateGroup } from "@/lib/format/mail-date";

const now = new Date(2026, 9, 30, 15, 0); // jeudi 30 octobre 2026, 15:00

describe("compactMailDate", () => {
  it("shows the time for today, 'hier' for yesterday, a weekday within the week", () => {
    expect(compactMailDate(new Date(2026, 9, 30, 9, 5), now)).toBe("09:05");
    expect(compactMailDate(new Date(2026, 9, 29, 23, 59), now)).toBe("hier");
    expect(compactMailDate(new Date(2026, 9, 26, 12, 0), now)).toBe("lun.");
  });

  it("shows day + month this year and a full date for older years", () => {
    expect(compactMailDate(new Date(2026, 8, 3), now)).toBe("3 sept.");
    expect(compactMailDate(new Date(2024, 9, 12), now)).toBe("12/10/2024");
  });
});

describe("mailDateGroup", () => {
  it("buckets by calendar day, not by elapsed hours", () => {
    expect(mailDateGroup(new Date(2026, 9, 30, 0, 1), now)).toBe("Aujourd'hui");
    expect(mailDateGroup(new Date(2026, 9, 29, 23, 59), now)).toBe("Hier");
    expect(mailDateGroup(new Date(2026, 9, 25), now)).toBe("Cette semaine");
    expect(mailDateGroup(new Date(2026, 9, 10), now)).toBe("Ce mois-ci");
    expect(mailDateGroup(new Date(2026, 6, 1), now)).toBe("Plus ancien");
  });
});
