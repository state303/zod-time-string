import { z } from 'zod';

// Base interface for all error message parameters
export interface TimeStringErrorParams {
    message: string | ( ( invalid: string ) => string );
}

// Format validation error parameters
export interface TimeStringFormatParams extends TimeStringErrorParams {
}

// Value validation error parameters
export interface TimeStringValueParams extends TimeStringErrorParams {
}

// Unit validation error parameters
export interface TimeStringUnitParams extends TimeStringErrorParams {
}

// Chainable validation method parameters
export interface TimeStringPositiveParams extends TimeStringErrorParams {
}

export interface TimeStringNegativeParams extends TimeStringErrorParams {
}

export interface TimeStringMinParams extends TimeStringErrorParams {
}

export interface TimeStringMaxParams extends TimeStringErrorParams {
}

// Options for the time string schema
export interface TimeStringOptions {
    invalidFormatError?: string | TimeStringFormatParams | ( ( invalid: string ) => string );
    invalidValueError?: string | TimeStringValueParams | ( ( invalid: string ) => string );
    invalidUnitError?: string | TimeStringUnitParams | ( ( invalid: string ) => string );
}

export const TimeUnit = {
    MILLISECOND: 'ms',
    SECOND: 's',
    MINUTE: 'm',
    HOUR: 'h',
    DAY: 'd',
    MONTH: 'mo',
    YEAR: 'y',
} as const;

export type TimeUnit = ( typeof TimeUnit )[keyof typeof TimeUnit];

const TIME_UNIT_TO_MS: Record<TimeUnit, number> = {
    [ TimeUnit.MILLISECOND ]: 1,
    [ TimeUnit.SECOND ]: 1000,
    [ TimeUnit.MINUTE ]: 60 * 1000,
    [ TimeUnit.HOUR ]: 60 * 60 * 1000,
    [ TimeUnit.DAY ]: 24 * 60 * 60 * 1000,
    [ TimeUnit.MONTH ]: 30 * 24 * 60 * 60 * 1000,
    [ TimeUnit.YEAR ]: 365 * 24 * 60 * 60 * 1000,
};

const TIME_UNIT_PATTERNS = {
    [ TimeUnit.MILLISECOND ]: 'milliseconds?|millisecond?|msecs?|msec?|ms',
    [ TimeUnit.SECOND ]: 'seconds?|second?|secs?|sec?|s',
    [ TimeUnit.MINUTE ]: 'minutes?|minute?|mins?|min?|m',
    [ TimeUnit.HOUR ]: 'hours?|hour?|hrs?|hr?|h',
    [ TimeUnit.DAY ]: 'days?|day?|d',
    [ TimeUnit.MONTH ]: 'months?|month?|mo|mth',
    [ TimeUnit.YEAR ]: 'years?|year?|yrs?|yr?|y',
};

const VALUE_PATTERN = '(-?(?:\\d+)?\\.?\\d+)';
// Use Object.keys instead of Object.values for ES2015 compatibility
const UNITS_PATTERN = Object.keys( TIME_UNIT_PATTERNS ).map( key => TIME_UNIT_PATTERNS[ key as TimeUnit ] ).join( '|' );
const FULL_PATTERN = new RegExp( `^\\s*${VALUE_PATTERN}\\s*(${UNITS_PATTERN})?\\s*$`, 'i' );

function getTimeUnit( unitStr: string ): TimeUnit | null {
    const lowerUnit = unitStr.toLowerCase();

    // Use Object.keys instead of Object.entries for ES2015 compatibility
    const timeUnitKeys = Object.keys( TIME_UNIT_PATTERNS ) as TimeUnit[];
    for ( const unit of timeUnitKeys ) {
        const pattern = TIME_UNIT_PATTERNS[ unit ];
        if ( new RegExp( `^(${pattern})$`, 'i' ).test( lowerUnit ) ) {
            return unit;
        }
    }

    return null;
}

// Improved type definition for TimeStringSchema with proper generics
export interface TimeStringSchema extends z.ZodType<number> {
    positive( params?: string | TimeStringPositiveParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    negative( params?: string | TimeStringNegativeParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    min( minValue: number, params?: string | TimeStringMinParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    max( maxValue: number, params?: string | TimeStringMaxParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    /**
     * Creates a new TimeStringSchema with custom error messages
     */
    withErrorMessages( options: TimeStringOptions ): TimeStringSchema;
}

/**
 * Creates a base time string schema with optional custom error messages
 */
/**
 * Helper function to resolve error messages from various formats
 */
function resolveErrorMessage(
    errorOption: string | TimeStringErrorParams | ( ( invalid: string ) => string ) | undefined,
    defaultMessage: string,
    invalidValue: string
): string {
    if ( !errorOption ) return defaultMessage;

    if ( typeof errorOption === 'string' ) {
        return errorOption;
    } else if ( typeof errorOption === 'function' ) {
        return errorOption( invalidValue );
    } else if ( typeof errorOption.message === 'function' ) {
        return errorOption.message( invalidValue );
    } else {
        return errorOption.message;
    }
}

function createBaseTimeStringSchema( options?: TimeStringOptions ) {
    return z
        .string()
        .check( ( v ) => {
            const value = v.value.trim();
            v.value = value;

            const match = FULL_PATTERN.exec( value );
            if ( !match ) {
                // Check if the value matches a pattern that might be a valid number with an invalid unit
                const possibleUnitMatch = /^(-?(?:\d+)?\.?\d+)\s*([a-zA-Z]+)$/.exec( value );

                if ( possibleUnitMatch && options?.invalidUnitError ) {
                    // This looks like a valid number with an invalid unit
                    const [ , , unitStr ] = possibleUnitMatch;
                    // Handle unitStr being potentially undefined in a type-safe way
                    const unitString = unitStr || '';
                    const message = resolveErrorMessage(
                        options.invalidUnitError,
                        `Invalid time unit: ${ unitString }`,
                        unitString
                    );

                    v.issues.push( {
                        code: 'invalid_format',
                        format: 'regex',
                        message,
                        input: value,
                    } );
                    return;
                } else {
                    // Regular format error
                    const message = resolveErrorMessage(
                        options?.invalidFormatError,
                        `Invalid time format: ${ value }`,
                        value
                    );

                    v.issues.push( {
                        code: 'invalid_format',
                        format: 'regex',
                        message,
                        input: value,
                    } );
                    return;
                }
            }

            const [ , valueStr, unitStr ] = match;
            if ( !valueStr ) {
                const message = resolveErrorMessage(
                    options?.invalidValueError,
                    `Invalid time value: ${ value }`,
                    value
                );

                v.issues.push( {
                    code: 'invalid_format',
                    format: 'regex',
                    message,
                    input: value,
                } );
                return;
            }

            const numValue = parseFloat( valueStr );

            // if no unit was provided, we assume it's in milliseconds
            if ( !unitStr ) {
                v.value = numValue.toString();
                return;
            }

            const unit = getTimeUnit( unitStr );
            if ( !unit ) {
                const message = resolveErrorMessage(
                    options?.invalidUnitError,
                    `Invalid time unit: ${ unitStr }`,
                    unitStr
                );

                v.issues.push( {
                    code: 'invalid_format',
                    format: 'regex',
                    message,
                    input: value,
                } );
                return;
            }

            const ms = numValue * TIME_UNIT_TO_MS[ unit ];
            v.value = ms.toString();
        } )
        .transform( ( v ) => parseInt( v ) );
}

// Base schema without the chainable methods
const baseTimeStringSchema = createBaseTimeStringSchema();

// Helper function for consistent refinement logic with error messages
function createRefinementWithMessage(
    schema: TimeStringSchema,
    checkFn: ( val: number ) => boolean,
    params: string | TimeStringErrorParams | ( ( invalid: string ) => string ) | undefined,
    defaultMessage: string
): TimeStringSchema {
    // For string params, use an object with the message property to preserve exact message
    if ( typeof params === 'string' ) {
        return createTimeStringSchema(
            schema.refine( checkFn, {
                message: params,
                path: [],
            } )
        );
    }
    // For function params, handle by converting the function to a string handler
    else if ( typeof params === 'function' ) {
        // First execute the check function, then call the params function with the string
        return createTimeStringSchema(
            schema.refine( checkFn, {
                message: defaultMessage, // Use default message in schema definition
                params: {
                    // Store the function for later use
                    customMessageFn: params
                }
            } )
        );
    }
    // For object params with function message
    else if ( params && typeof params.message === 'function' ) {
        // First execute the check function, then call the params.message function with the string
        return createTimeStringSchema(
            schema.refine( checkFn, {
                message: defaultMessage, // Use default message in schema definition
                params: {
                    // Store the function for later use
                    customMessageFn: params.message
                }
            } )
        );
    }
    // For object params with string message or default case
    else {
        const message = params && typeof params.message === 'string'
            ? params.message
            : defaultMessage;

        return createTimeStringSchema(
            schema.refine( checkFn, {
                message,
                path: [],
            } )
        );
    }
}

// Function to add chainable methods to the schema with improved typing
function createTimeStringSchema( schema: z.ZodType<number>, options?: TimeStringOptions ): TimeStringSchema {
    const newSchema = schema as TimeStringSchema;

    // Add positive validation with custom error message support
    newSchema.positive = function ( params?: string | TimeStringPositiveParams | ( ( invalid: string ) => string ) ) {
        return createRefinementWithMessage(
            this,
            ( val ) => val > 0,
            params,
            "Value must be positive"
        );
    };

    // Add negative validation with custom error message support
    newSchema.negative = function ( params?: string | TimeStringNegativeParams | ( ( invalid: string ) => string ) ) {
        return createRefinementWithMessage(
            this,
            ( val ) => val < 0,
            params,
            "Value must be negative"
        );
    };

    // Add minimum value validation with custom error message support
    newSchema.min = function ( minValue: number, params?: string | TimeStringMinParams | ( ( invalid: string ) => string ) ) {
        return createRefinementWithMessage(
            this,
            ( val ) => val >= minValue,
            params,
            `Value must be greater than or equal to ${ minValue }`
        );
    };

    // Add maximum value validation with custom error message support
    newSchema.max = function ( maxValue: number, params?: string | TimeStringMaxParams | ( ( invalid: string ) => string ) ) {
        return createRefinementWithMessage(
            this,
            ( val ) => val <= maxValue,
            params,
            `Value must be less than or equal to ${ maxValue }`
        );
    };

    // Add withErrorMessages method to create a new schema with custom error messages
    newSchema.withErrorMessages = function ( customOptions: TimeStringOptions ) {
        // Create a new base schema with the custom error messages
        const newBaseSchema = createBaseTimeStringSchema( customOptions );

        // Add the chainable methods to the new schema
        return createTimeStringSchema( newBaseSchema, customOptions );
    };

    return newSchema;
}

// Export the enhanced schema with chainable methods
export const timeStringSchema = createTimeStringSchema( baseTimeStringSchema );