/**
 * Integration test for the built package
 * This test imports from the dist directory to ensure the built package works as expected
 */

// Import from the dist directory (the built output)
import { zodTimeString } from '../dist';

describe('zodTimeString integration', () => {
  // Basic functionality test
  test('should parse time strings from the built package', () => {
    // Test a few basic time formats
    expect(zodTimeString.parse('5m')).toBe(300000);
    expect(zodTimeString.parse('1h')).toBe(3600000);
    expect(zodTimeString.parse('1.5d')).toBe(129600000);
    expect(zodTimeString.parse('100ms')).toBe(100);
  });

  // Test chainable methods
  test('should support chainable validation methods from the built package', () => {
    const schema = zodTimeString.positive().min(1000).max(3600000);
    
    // Valid cases
    expect(schema.parse('30s')).toBe(30000);
    expect(schema.parse('1s')).toBe(1000);
    expect(schema.parse('1h')).toBe(3600000);
    
    // Invalid cases
    expect(() => schema.parse('500ms')).toThrow();
    expect(() => schema.parse('2h')).toThrow();
    expect(() => schema.parse('-30s')).toThrow();
  });

  // Test custom error messages
  test('should support custom error messages from the built package', () => {
    const customMsg = 'Invalid time format';
    const schema = zodTimeString.withErrorMessages({
      invalidFormatError: customMsg
    });

    try {
      schema.parse('abc');
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.issues[0].message).toBe(customMsg);
    }
  });
});