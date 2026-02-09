import { getLastLine, looksSensitive, isUserTurn } from './index.js';

describe('Server Helper Functions', () => {

  // --- 1. Transcript Parsing ---
  describe('getLastLine()', () => {
    test('returns empty string for empty input', () => {
      expect(getLastLine("")).toBe("");
      expect(getLastLine(null)).toBe("");
    });

    test('gets the last line correctly', () => {
      const transcript = "Me: Hello\nRep: Hi there\nMe: Thanks";
      expect(getLastLine(transcript)).toBe("Me: Thanks");
    });

    test('ignores trailing empty lines/whitespace', () => {
      const transcript = "Me: Hello\nRep: Hi\n  \n";
      expect(getLastLine(transcript)).toBe("Rep: Hi");
    });
  });

  // --- 2. Security Checks ---
  describe('looksSensitive()', () => {
    test('detects standard sensitive keywords', () => {
      expect(looksSensitive("What is your password?")).toBe(true);
      expect(looksSensitive("Send me your OTP")).toBe(true);
      expect(looksSensitive("verify your ssn")).toBe(true);
      expect(looksSensitive("last 4 digits")).toBe(true);
      expect(looksSensitive("credit card cvv")).toBe(true);
      expect(looksSensitive("bank account number")).toBe(true);
    });

    test('ignores safe text', () => {
      expect(looksSensitive("hello")).toBe(false);
      expect(looksSensitive("meeting pass")).toBe(false); // contains 'pass' but not 'password'
      expect(looksSensitive("passport")).toBe(false); // contains 'pass' but is safe
      expect(looksSensitive("my order number is 1234")).toBe(false);
    });
  });

  // --- 3. Loop Prevention Logic ---
  describe('isUserTurn()', () => {
    test('it is NOT user turn if user just spoke', () => {
      expect(isUserTurn("Me: Hello")).toBe(false);
    });

    test('it IS user turn if rep just spoke', () => {
      expect(isUserTurn("Me: Hello\nRep: Hi")).toBe(true);
    });

    test('it IS user turn if rep spoke multiple times (catching up)', () => {
      expect(isUserTurn("Me: Hi\nRep: Hello\nRep: How can I help?")).toBe(true);
    });

    test('it is NOT user turn if user spoke multiple times (spamming)', () => {
      // Me: 2, Rep: 1 -> Rep needs to answer
      expect(isUserTurn("Rep: Hi\nMe: I need help\nMe: Hello?")).toBe(false);
    });
  });
});