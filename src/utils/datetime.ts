/**
 * UTC DateTime Utilities
 * 
 * This utility ensures all datetime operations are handled in UTC timezone
 * to maintain consistency across the entire application.
 */

/**
 * Get current UTC datetime
 * @returns Current datetime in UTC
 */
export function getCurrentUTC(): Date {
    return new Date();
}

/**
 * Get current UTC datetime as ISO string
 * @returns Current datetime in UTC as ISO string
 */
export function getCurrentUTCISO(): string {
    return new Date().toISOString();
}

/**
 * Get current UTC timestamp in milliseconds
 * @returns Current UTC timestamp
 */
export function getCurrentUTCTimestamp(): number {
    return Date.now();
}

/**
 * Create a UTC datetime from a date string or Date object
 * @param date - Date string or Date object
 * @returns UTC datetime
 */
export function createUTC(date: string | Date): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
}

/**
 * Add days to a UTC datetime
 * @param date - Base date (defaults to current UTC)
 * @param days - Number of days to add
 * @returns New UTC datetime
 */
export function addDaysUTC(date: Date = getCurrentUTC(), days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

/**
 * Add hours to a UTC datetime
 * @param date - Base date (defaults to current UTC)
 * @param hours - Number of hours to add
 * @returns New UTC datetime
 */
export function addHoursUTC(date: Date = getCurrentUTC(), hours: number): Date {
    const result = new Date(date);
    result.setUTCHours(result.getUTCHours() + hours);
    return result;
}

/**
 * Add minutes to a UTC datetime
 * @param date - Base date (defaults to current UTC)
 * @param minutes - Number of minutes to add
 * @returns New UTC datetime
 */
export function addMinutesUTC(date: Date = getCurrentUTC(), minutes: number): Date {
    const result = new Date(date);
    result.setUTCMinutes(result.getUTCMinutes() + minutes);
    return result;
}

/**
 * Add milliseconds to a UTC datetime
 * @param date - Base date (defaults to current UTC)
 * @param milliseconds - Number of milliseconds to add
 * @returns New UTC datetime
 */
export function addMillisecondsUTC(date: Date = getCurrentUTC(), milliseconds: number): Date {
    const result = new Date(date);
    result.setUTCMilliseconds(result.getUTCMilliseconds() + milliseconds);
    return result;
}

/**
 * Check if a datetime is in the future (UTC)
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFutureUTC(date: Date): boolean {
    return date > getCurrentUTC();
}

/**
 * Check if a datetime is in the past (UTC)
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPastUTC(date: Date): boolean {
    return date < getCurrentUTC();
}

/**
 * Get the difference between two dates in milliseconds (UTC)
 * @param date1 - First date
 * @param date2 - Second date (defaults to current UTC)
 * @returns Difference in milliseconds
 */
export function getTimeDifferenceUTC(date1: Date, date2: Date = getCurrentUTC()): number {
    return date1.getTime() - date2.getTime();
}

/**
 * Format a UTC datetime for display
 * @param date - Date to format
 * @param format - Format string (defaults to ISO)
 * @returns Formatted date string
 */
export function formatUTC(date: Date, format: 'iso' | 'local' | 'utc' = 'iso'): string {
    switch (format) {
        case 'iso':
            return date.toISOString();
        case 'local':
            return date.toLocaleString();
        case 'utc':
            return date.toUTCString();
        default:
            return date.toISOString();
    }
}

/**
 * Parse a date string and ensure it's in UTC
 * @param dateString - Date string to parse
 * @returns UTC datetime
 */
export function parseUTC(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date string: ${dateString}`);
    }
    return createUTC(date);
}

/**
 * Get start of day in UTC
 * @param date - Date (defaults to current UTC)
 * @returns Start of day in UTC
 */
export function getStartOfDayUTC(date: Date = getCurrentUTC()): Date {
    const result = new Date(date);
    result.setUTCHours(0, 0, 0, 0);
    return result;
}

/**
 * Get end of day in UTC
 * @param date - Date (defaults to current UTC)
 * @returns End of day in UTC
 */
export function getEndOfDayUTC(date: Date = getCurrentUTC()): Date {
    const result = new Date(date);
    result.setUTCHours(23, 59, 59, 999);
    return result;
}

/**
 * Check if a datetime is within a time range (UTC)
 * @param date - Date to check
 * @param start - Start of range
 * @param end - End of range
 * @returns True if date is within range
 */
export function isWithinRangeUTC(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
}

/**
 * Get timezone offset in minutes for a specific date
 * @param date - Date to get offset for (defaults to current UTC)
 * @returns Timezone offset in minutes
 */
export function getTimezoneOffsetUTC(date: Date = getCurrentUTC()): number {
    return date.getTimezoneOffset();
}

/**
 * Convert local datetime to UTC
 * @param localDate - Local datetime
 * @returns UTC datetime
 */
export function localToUTC(localDate: Date): Date {
    return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
}

/**
 * Convert UTC datetime to local
 * @param utcDate - UTC datetime
 * @returns Local datetime
 */
export function utcToLocal(utcDate: Date): Date {
    return new Date(utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000));
}

/**
 * Parse time string in HH:mm format
 * @param timeString - Time string in HH:mm format (e.g., "10:00", "16:30")
 * @returns Object with hours and minutes
 */
export function parseTimeString(timeString: string): { hours: number; minutes: number } {
    const [hoursStr, minutesStr] = timeString.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid time format. Use HH:mm format (e.g., 10:00, 16:30)');
    }

    return { hours, minutes };
} 