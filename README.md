# zod-time-string

A Zod schema for parsing and validating time strings in various formats.

[![npm version](https://img.shields.io/npm/v/@state303/zod-time-string.svg)](https://www.npmjs.com/package/@state303/zod-time-string)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`zod-time-string` provides a Zod schema that parses human-readable time strings (like `5m`, `2h`, `1.5d`) and converts them to milliseconds. It supports a wide variety of time unit formats and handles decimal and negative values.

## Installation

```bash
# npm
npm install @state303/zod-time-string

# yarn
yarn add @state303/zod-time-string

# pnpm
pnpm add @state303/zod-time-string
```

### Peer Dependencies

This package has the following peer dependencies:
- `zod`: ^4
- `typescript`: ^5

## Usage

```typescript
import zts from '@state303/zod-time-string';

// Parse time strings to milliseconds
const milliseconds = zodTimeString.parse('5m');  // 300000 (5 minutes in ms)

// Handles various formats
zts.parse('1h');      // 3600000 (1 hour in ms)
zts.parse('1.5d');    // 129600000 (1.5 days in ms)
zts.parse('100ms');   // 100 (100 milliseconds)
zts.parse('2.5 hrs'); // 9000000 (2.5 hours in ms)

// Numbers without units are interpreted as milliseconds
zts.parse('1000');    // 1000 (milliseconds)

// Will throw for invalid formats
try {
  zts.parse('abc');
  zts.parse('5z');    // Invalid unit
} catch (error) {
  // Handle validation errors
}
```

## API

### `zodTimeString`

The main export is a Zod schema that validates and transforms time strings.

```typescript
import { zodTimeString } from '@state303/zod-time-string';

// OR

import zts from '@state303/zod-time-string'
```

Input: String containing a number with an optional time unit.
Output: Number representing the time in milliseconds.

#### Chainable Validation Methods

The schema provides chainable validation methods for additional constraints:

##### `positive(params?: string | TimeStringPositiveParams)`

Validates that the parsed value is positive (greater than 0).

```typescript
// Validates that the time is positive
const schema = zodTimeString.positive();
schema.parse('5m');       // 300000 (valid)
schema.parse('0ms');      // throws error (zero is not positive)
schema.parse('-1h');      // throws error (negative)
```

##### `negative(params?: string | TimeStringNegativeParams)`

Validates that the parsed value is negative (less than 0).

```typescript
// Validates that the time is negative
const schema = zodTimeString.negative();
schema.parse('-5m');      // -300000 (valid)
schema.parse('0ms');      // throws error (zero is not negative)
schema.parse('1h');       // throws error (positive)
```

##### `min(value: number, params?: string | TimeStringMinParams)`

Validates that the parsed value is greater than or equal to the specified minimum (in milliseconds).

```typescript
// Validates that the time is at least 1 second (1000ms)
const schema = zodTimeString.min(1000);
schema.parse('1s');       // 1000 (valid - equal to min)
schema.parse('5s');       // 5000 (valid - greater than min)
schema.parse('500ms');    // throws error (less than min)
```

##### `max(value: number, params?: string | TimeStringMaxParams)`

Validates that the parsed value is less than or equal to the specified maximum (in milliseconds).

```typescript
// Validates that the time is at most 1 minute (60000ms)
const schema = zodTimeString.max(60000);
schema.parse('1m');       // 60000 (valid - equal to max)
schema.parse('30s');      // 30000 (valid - less than max)
schema.parse('2m');       // throws error (greater than max)
```

#### Chaining Multiple Validations

The validation methods can be chained together to create complex validation rules:

```typescript
// Validates that the time is:
// 1. Positive
// 2. At least 1 second (1000ms)
// 3. At most 1 hour (3600000ms)
const schema = zodTimeString
  .positive()
  .min(1000)
  .max(3600000);

schema.parse('30s');      // 30000 (valid)
schema.parse('1s');       // 1000 (valid - equal to min)
schema.parse('1h');       // 3600000 (valid - equal to max)
schema.parse('500ms');    // throws error (less than min)
schema.parse('2h');       // throws error (greater than max)
schema.parse('-30s');     // throws error (not positive)
```

#### Custom Error Messages

You can customize error messages for all validations to better fit your application's needs.

##### Basic Validation Error Messages

Use the `withErrorMessages` method to customize error messages for the basic validations:

```typescript
import zts from '@state303/zod-time-string';

const schema = zts.withErrorMessages({
  invalidFormatError: 'The time format is invalid',
  invalidValueError: 'The time value is invalid',
  invalidUnitError: 'The time unit is not recognized',
});

// Or with object format for more options
const schema2 = zts.withErrorMessages({
  invalidFormatError: { message: 'The time format is invalid' },
  invalidUnitError: { message: 'The time unit is not recognized' },
});

// With function-based format for dynamic error messages
const schema3 = zts.withErrorMessages({
  invalidFormatError: (invalid) => `"${invalid}" is not a valid time format`,
  invalidUnitError: (unitStr) => `Unit "${unitStr}" is not supported`,
});

// Or with function in object format
const schema4 = zts.withErrorMessages({
  invalidFormatError: { 
    message: (invalid) => `Could not parse "${invalid}" as a time string` 
  }
});
```

##### Chainable Validation Error Messages

Each chainable validation method accepts a custom error message parameter:

```typescript
// With string format
import zts from '@state303/zod-time-string';
const schema = zts
  .positive('Value must be greater than zero')
  .min(1000, 'Value must be at least 1 second')
  .max(3600000, 'Value must be at most 1 hour');

// Or with object format
const schema2 = zts
  .positive({ message: 'Value must be greater than zero' })
  .min(1000, { message: 'Value must be at least 1 second' });

// With function-based error messages for dynamic formatting
const schema3 = zts
  .positive((invalidValue) => `Value ${invalidValue} must be positive`)
  .min(1000, (invalidValue) => `Value ${invalidValue} is below the minimum of 1000ms`)
  .max(60000, (invalidValue) => `Value ${invalidValue} exceeds the maximum of 1 minute`);

// Function-based messages can also be used within objects
const schema4 = zts
  .positive({ 
    message: (value) => `Expected a positive value, but got ${value}` 
  });
```

### `TimeUnit`

An exported object and type containing all supported time units.

```typescript
import { TimeUnit } from '@state303/zod-time-string';

// Available units
TimeUnit.MILLISECOND // 'ms'
TimeUnit.SECOND      // 's'
TimeUnit.MINUTE      // 'm'
TimeUnit.HOUR        // 'h'
TimeUnit.DAY         // 'd'
TimeUnit.MONTH       // 'mo'
TimeUnit.YEAR        // 'y'
```

## Supported Time Formats

The schema supports a wide variety of time formats:

### Units

| Unit | Supported Formats |
|------|-------------------|
| Milliseconds | `ms`, `msec`, `msecs`, `millisecond`, `milliseconds` |
| Seconds | `s`, `sec`, `secs`, `second`, `seconds` |
| Minutes | `m`, `min`, `mins`, `minute`, `minutes` |
| Hours | `h`, `hr`, `hrs`, `hour`, `hours` |
| Days | `d`, `day`, `days` |
| Months | `mo`, `mth`, `month`, `months` |
| Years | `y`, `yr`, `yrs`, `year`, `years` |

### Value Formats

- Integer values: `5m`, `10h`
- Decimal values: `1.5h`, `0.5d`
- Negative values: `-1h`, `-30m`
- Decimal values without leading zero: `.5m`
- Values with whitespace: `5 m`, ` 10 hours `

## Examples

```typescript
// Basic usage
zodTimeString.parse('100ms');   // 100
zodTimeString.parse('1s');      // 1000
zodTimeString.parse('5m');      // 300000
zodTimeString.parse('2h');      // 7200000
zodTimeString.parse('1d');      // 86400000
zodTimeString.parse('1mo');     // 2592000000
zodTimeString.parse('1y');      // 31536000000

// Edge cases
zodTimeString.parse('1.5h');    // 5400000 (1.5 hours)
zodTimeString.parse('0.5d');    // 43200000 (half day)
zodTimeString.parse('.5m');     // 30000 (half minute)
zodTimeString.parse('-1h');     // -3600000 (negative 1 hour)
zodTimeString.parse('  5  h  '); // 18000000 (whitespace handled)
zodTimeString.parse('5M');      // 300000 (case insensitive)
```

## License

MIT © [state303](https://github.com/state303)
