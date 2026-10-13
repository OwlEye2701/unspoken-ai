import { isAgeEligibleUser } from "../src/lib/auth-security";
import { isEligibleAge, calculateAge } from "../src/lib/validation";

describe("Server-Controlled Age Gate Security Invariants", () => {
  it("rejects user who attempts client-side spoofing via user_metadata.age_verified", () => {
    // Attacker signs up with client SDK or calls supabase.auth.updateUser({ data: { age_verified: true } })
    const spoofedUser = {
      id: "attacker-1",
      app_metadata: {},
      user_metadata: {
        age_verified: true,
        age_eligible: true,
      },
    };

    expect(isAgeEligibleUser(spoofedUser)).toBe(false);
  });

  it("rejects authenticated user attempting to manipulate user_metadata claims", () => {
    // Authenticated user mutating their profile data
    const mutatedUser = {
      id: "user-2",
      app_metadata: {
        provider: "email",
        // Notice: app_metadata does NOT have age_eligible: true
      },
      user_metadata: {
        age_verified: true,
        age_eligible: true,
        min_age: 18,
      },
    };

    expect(isAgeEligibleUser(mutatedUser)).toBe(false);
  });

  it("rejects user with missing or empty metadata", () => {
    expect(isAgeEligibleUser(null)).toBe(false);
    expect(isAgeEligibleUser(undefined)).toBe(false);
    expect(isAgeEligibleUser({})).toBe(false);
    expect(isAgeEligibleUser({ app_metadata: {} })).toBe(false);
  });

  it("rejects user with falsy or non-boolean app_metadata claims", () => {
    expect(isAgeEligibleUser({ app_metadata: { age_eligible: false } })).toBe(false);
    expect(
      isAgeEligibleUser({
        app_metadata: { age_eligible: "true" as unknown as boolean },
      })
    ).toBe(false);
    expect(
      isAgeEligibleUser({
        app_metadata: { age_eligible: 1 as unknown as boolean },
      })
    ).toBe(false);
  });

  it("grants eligibility ONLY to user possessing trusted server-assigned app_metadata claim", () => {
    // Legitimate server administrative operation sets app_metadata: { age_eligible: true }
    const authorizedUser = {
      id: "legit-user-3",
      app_metadata: {
        provider: "email",
        age_eligible: true,
        verified_at: "2026-10-13T12:00:00.000Z",
      },
      user_metadata: {},
    };

    expect(isAgeEligibleUser(authorizedUser)).toBe(true);
  });
});

describe("Date of Birth Validation Security Boundaries", () => {
  function formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  it("strictly rejects applicant under 16 years old", () => {
    const today = new Date();
    const dob15 = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
    const dobString = formatLocalDate(dob15);

    expect(calculateAge(dobString)).toBe(15);
    expect(isEligibleAge(dobString)).toBe(false);
  });

  it("strictly rejects applicant who turns 16 tomorrow", () => {
    const today = new Date();
    const dobTurnsTomorrow = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate() + 1);
    const dobString = formatLocalDate(dobTurnsTomorrow);

    expect(calculateAge(dobString)).toBe(15);
    expect(isEligibleAge(dobString)).toBe(false);
  });

  it("strictly rejects future birth dates", () => {
    const today = new Date();
    const futureDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const futureString = formatLocalDate(futureDate);

    expect(calculateAge(futureString)).toBe(-1);
    expect(isEligibleAge(futureString)).toBe(false);
  });

  it("strictly rejects invalid calendar rollover dates", () => {
    // February 31 is invalid calendar day
    expect(calculateAge("2008-02-31")).toBe(-1);
    expect(isEligibleAge("2008-02-31")).toBe(false);

    // April 31 is invalid (April has 30 days)
    expect(calculateAge("2008-04-31")).toBe(-1);
    expect(isEligibleAge("2008-04-31")).toBe(false);
  });

  it("strictly rejects malformed or non-date inputs", () => {
    expect(calculateAge("")).toBe(-1);
    expect(calculateAge("not-a-date")).toBe(-1);
    expect(calculateAge("1990/01/01")).toBe(new Date().getFullYear() - 1990); // standard parse if valid
    expect(calculateAge("0000-00-00")).toBe(-1);
    expect(isEligibleAge("undefined")).toBe(false);
  });

  it("approves legitimate applicant aged 16 or older", () => {
    const today = new Date();
    const dob16Today = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    const dobString = formatLocalDate(dob16Today);

    expect(calculateAge(dobString)).toBe(16);
    expect(isEligibleAge(dobString)).toBe(true);

    expect(isEligibleAge("2000-01-01")).toBe(true);
    expect(isEligibleAge("1995-06-15")).toBe(true);
  });
});
