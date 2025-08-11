/**
 * Utility functions for serializing data for JSON responses
 * 
 * ⚠️  CRITICAL: ALWAYS USE THESE SERIALIZATION FUNCTIONS FOR ALL API RESPONSES ⚠️
 * 
 * BigInt values from Prisma queries cannot be serialized to JSON directly.
 * This causes "Do not know how to serialize a BigInt" errors.
 * 
 * IMPORTANT RULES:
 * 1. ALWAYS serialize response data before sending it in res.json()
 * 2. Use serializeForJSON() for complex objects and arrays
 * 3. Use serializeEntityResponse() for single entity responses
 * 4. Use serializeEntitiesResponse() for array responses
 * 5. Use serializePaginatedResponse() for paginated responses
 * 6. Use serializeUser() for user objects (removes sensitive fields)
 * 
 * EXAMPLES:
 * ✅ CORRECT:
 * res.status(200).json({
 *   success: true,
 *   data: serializeEntityResponse(user)
 * });
 * 
 * ❌ WRONG:
 * res.status(200).json({
 *   success: true,
 *   data: user  // This will cause BigInt serialization error!
 * });
 * 
 * Common serialization functions:
 * - serializeForJSON(): Generic serialization for any object
 * - serializeUser(): For user objects (removes sensitive fields)
 * - serializeJobPost(): For job post objects
 * - serializeApplication(): For application objects
 * - serializeOrganization(): For organization objects
 * - serializePaginatedResponse(): For paginated responses
 * - serializeEntityResponse(): For single entity responses
 * - serializeEntitiesResponse(): For multiple entity responses
 */

/**
 * Serialize an object, converting BigInt values to strings and ensuring proper DateTime handling
 * This is necessary because JSON.stringify cannot handle BigInt values
 */
export function serializeForJSON(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'bigint') {
        return obj.toString();
    }

    // Handle Date objects to ensure proper serialization
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeForJSON);
    }

    if (typeof obj === 'object') {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            serialized[key] = serializeForJSON(value);
        }
        return serialized;
    }

    return obj;
}

/**
 * Serialize a user object for API responses
 * Removes sensitive fields and converts BigInt to string
 */
export function serializeUser(user: any): any {
    if (!user) {
        return null;
    }

    // Remove sensitive fields
    const {
        password,
        emailVerificationToken,
        emailVerificationExpires,
        passwordResetToken,
        passwordResetExpires,
        ...safeUser
    } = user;

    // Serialize the remaining fields
    return serializeForJSON(safeUser);
}

/**
 * Serialize a job post object for API responses
 * Converts BigInt to string and ensures proper formatting
 */
export function serializeJobPost(jobPost: any): any {
    if (!jobPost) {
        return null;
    }

    // Serialize the job post
    return serializeForJSON(jobPost);
}

/**
 * Serialize an application object for API responses
 * Converts BigInt to string and ensures proper formatting
 */
export function serializeApplication(application: any): any {
    if (!application) {
        return null;
    }

    // Serialize the application
    return serializeForJSON(application);
}

/**
 * Serialize an organization object for API responses
 * Converts BigInt to string and ensures proper formatting
 */
export function serializeOrganization(organization: any): any {
    if (!organization) {
        return null;
    }

    // Serialize the organization
    return serializeForJSON(organization);
}

/**
 * Serialize paginated response data
 * Handles arrays of objects and converts BigInt values
 */
export function serializePaginatedResponse<T>(response: {
    data: T[];
    pagination: any;
}): {
    data: any[];
    pagination: any;
} {
    if (!response) {
        return { data: [], pagination: {} };
    }

    return {
        data: response.data.map((item: any) => serializeForJSON(item)),
        pagination: serializeForJSON(response.pagination)
    };
}

/**
 * Serialize a single entity response
 * Converts BigInt to string for single object responses
 */
export function serializeEntityResponse<T>(entity: T): any {
    return serializeForJSON(entity);
}

/**
 * Serialize multiple entities response
 * Converts BigInt to string for array responses
 */
export function serializeEntitiesResponse<T>(entities: T[]): any[] {
    if (!entities || !Array.isArray(entities)) {
        return [];
    }

    return entities.map((entity: any) => serializeForJSON(entity));
} 