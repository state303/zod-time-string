import { z } from 'zod';

// Base interface for all error message parameters
export interface TimeStringErrorParams {
    message: string | ( ( invalid: string ) => string );
}

// Common type for error parameters
export type ErrorParamType = string | TimeStringErrorParams | ( ( invalid: string ) => string ) | undefined;

// Options for the time string schema
export interface TimeStringOptions {
    invalidFormatError?: ErrorParamType;
    invalidValueError?: ErrorParamType;
    invalidUnitError?: ErrorParamType;
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

// Pre-compile regex patterns for better performance
const TIME_UNIT_REGEX_MAP: Record<TimeUnit, RegExp> = ( () => {
    const map: Record<string, RegExp> = {};
    const timeUnitKeys = Object.keys( TIME_UNIT_PATTERNS ) as TimeUnit[];
    for ( const unit of timeUnitKeys ) {
        map[ unit ] = new RegExp( `^(${TIME_UNIT_PATTERNS[unit]})$`, 'i' );
    }
    return map as Record<TimeUnit, RegExp>;
} )();

const VALUE_PATTERN = '(-?(?:\\d+)?\\.?\\d+)';
// Use Object.keys instead of Object.values for ES2015 compatibility
const UNITS_PATTERN = Object.keys( TIME_UNIT_PATTERNS ).map( key => TIME_UNIT_PATTERNS[ key as TimeUnit ] ).join( '|' );
const FULL_PATTERN = new RegExp( `^\\s*${VALUE_PATTERN}\\s*(${UNITS_PATTERN})?\\s*$`, 'i' );
const POSSIBLE_UNIT_PATTERN = new RegExp( `^(-?(?:\\d+)?\\.?\\d+)\\s*([a-zA-Z]+)$` );

function getTimeUnit( unitStr: string ): TimeUnit | null {
    const lowerUnit = unitStr.toLowerCase();
    const timeUnitKeys = Object.keys( TIME_UNIT_PATTERNS ) as TimeUnit[];

    for ( const unit of timeUnitKeys ) {
        if ( TIME_UNIT_REGEX_MAP[ unit ].test( lowerUnit ) ) {
            return unit;
        }
    }

    return null;
}

// Improved type definition for TimeStringSchema with proper generics
export interface TimeStringSchema extends z.ZodType<number> {
    positive( params?: string | TimeStringErrorParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    negative( params?: string | TimeStringErrorParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    min( minValue: number, params?: string | TimeStringErrorParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

    max( maxValue: number, params?: string | TimeStringErrorParams | ( ( invalid: string ) => string ) ): TimeStringSchema;

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
    errorOption: ErrorParamType,
    defaultMessage: string,
    invalidValue: string
): string {
    if ( !errorOption ) return defaultMessage;

    if ( typeof errorOption === 'string' ) return errorOption;
    if ( typeof errorOption === 'function' ) return errorOption( invalidValue );

    const { message } = errorOption;
    return typeof message === 'function' ? message( invalidValue ) : message;
}

// Helper function to create an issue in the validation context
function createIssue( v: any, message: string, input: string ) {
    v.issues.push( {
        code: 'invalid_format',
        format: 'regex',
        message,
        input,
    } );
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
                const possibleUnitMatch = POSSIBLE_UNIT_PATTERN.exec( value );

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

                    createIssue( v, message, value );
                    return;
                } else {
                    // Regular format error
                    const message = resolveErrorMessage(
                        options?.invalidFormatError,
                        `Invalid time format: ${ value }`,
                        value
                    );

                    createIssue( v, message, value );
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

                createIssue( v, message, value );
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

                createIssue( v, message, value );
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
    params: ErrorParamType,
    defaultMessage: string
): TimeStringSchema {
    // Extract message and customMessageFn
    let message = defaultMessage;
    let customMessageFn = undefined;

    if ( typeof params === 'string' ) {
        message = params;
    } else if ( typeof params === 'function' ) {
        customMessageFn = params;
    } else if ( params?.message ) {
        if ( typeof params.message === 'function' ) {
            customMessageFn = params.message;
        } else {
            message = params.message;
        }
    }

    // Create refinement with appropriate options
    return createTimeStringSchema(
        schema.refine( checkFn, {
            message,
            path: [],
            ...( customMessageFn ? { params: { customMessageFn } } : {} )
        } )
    );
}

// Function to add chainable methods to the schema with improved typing
function createTimeStringSchema( schema: z.ZodType<number>, options?: TimeStringOptions ): TimeStringSchema {
    const newSchema = schema as TimeStringSchema;

    // Add positive validation with custom error message support
    newSchema.positive = function ( params?: ErrorParamType ): TimeStringSchema {
        return createRefinementWithMessage(
            this,
            ( val ) => val > 0,
            params,
            "Value must be positive"
        );
    };

    // Add negative validation with custom error message support
    newSchema.negative = function ( params?: ErrorParamType ): TimeStringSchema {
        return createRefinementWithMessage(
            this,
            ( val ) => val < 0,
            params,
            "Value must be negative"
        );
    };

    // Add minimum value validation with custom error message support
    newSchema.min = function ( minValue: number, params?: ErrorParamType ): TimeStringSchema {
        return createRefinementWithMessage(
            this,
            ( val ) => val >= minValue,
            params,
            `Value must be greater than or equal to ${ minValue }`
        );
    };

    // Add maximum value validation with custom error message support
    newSchema.max = function ( maxValue: number, params?: ErrorParamType ): TimeStringSchema {
        return createRefinementWithMessage(
            this,
            ( val ) => val <= maxValue,
            params,
            `Value must be less than or equal to ${ maxValue }`
        );
    };

    // Add withErrorMessages method to create a new schema with custom error messages
    newSchema.withErrorMessages = function ( customOptions: TimeStringOptions ) {
        return createTimeStringSchema( createBaseTimeStringSchema( customOptions ), customOptions );
    };

    return newSchema;
}

// Export the enhanced schema with chainable methods
export const timeStringSchema = createTimeStringSchema( baseTimeStringSchema );