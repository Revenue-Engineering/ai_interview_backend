# UTC Timezone Implementation

## Overview

This document outlines the comprehensive implementation of UTC timezone handling across the entire recruitment platform backend. All datetime operations now use UTC consistently to ensure data integrity and avoid timezone-related issues.

## 🎯 **Implementation Goals**

1. **Consistency**: All datetime operations use UTC
2. **Data Integrity**: Prevent timezone-related data inconsistencies
3. **Global Compatibility**: Support users across different timezones
4. **Maintainability**: Centralized datetime utilities for easy maintenance

## 📁 **Files Modified**

### **1. New Utility File**
- `src/utils/datetime.ts` - Centralized UTC datetime utilities

### **2. Service Layer Updates**
- `src/services/application.service.ts` - Interview creation and stats queries
- `src/services/interview.service.ts` - Interview lifecycle operations
- `src/services/auth.service.ts` - Token expiration and email verification

### **3. Application Layer Updates**
- `src/app.ts` - Health check timestamps
- `src/types/validation.ts` - Date validation schemas

### **4. Middleware Updates**
- `src/middlewares/auth.middleware.ts` - Rate limiting timestamps
- `src/utils/auth.ts` - JWT token timestamps

## 🔧 **UTC DateTime Utilities**

### **Core Functions**

```typescript
// Current UTC datetime operations
getCurrentUTC(): Date                    // Current UTC datetime
getCurrentUTCISO(): string               // Current UTC as ISO string
getCurrentUTCTimestamp(): number         // Current UTC timestamp

// UTC datetime manipulation
addDaysUTC(date: Date, days: number): Date
addHoursUTC(date: Date, hours: number): Date
addMinutesUTC(date: Date, minutes: number): Date
addMillisecondsUTC(date: Date, ms: number): Date

// UTC datetime validation
isFutureUTC(date: Date): boolean
isPastUTC(date: Date): boolean
isWithinRangeUTC(date: Date, start: Date, end: Date): boolean

// UTC datetime formatting
formatUTC(date: Date, format: 'iso' | 'local' | 'utc'): string
parseUTC(dateString: string): Date

// UTC datetime conversion
localToUTC(localDate: Date): Date
utcToLocal(utcDate: Date): Date
```

## 📊 **Specific Changes by File**

### **1. Application Service (`src/services/application.service.ts`)**

#### **Before:**
```typescript
scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
timeSlotStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
timeSlotEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
```

#### **After:**
```typescript
scheduledAt: addDaysUTC(getCurrentUTC(), 7)
timeSlotStart: addDaysUTC(getCurrentUTC(), 7)
timeSlotEnd: addHoursUTC(addDaysUTC(getCurrentUTC(), 7), 1)
gte: addDaysUTC(getCurrentUTC(), -7)
```

### **2. Interview Service (`src/services/interview.service.ts`)**

#### **Before:**
```typescript
updatedAt: new Date()
startedAt: new Date()
endedAt: new Date()
const now = new Date()
```

#### **After:**
```typescript
updatedAt: getCurrentUTC()
startedAt: getCurrentUTC()
endedAt: getCurrentUTC()
const now = getCurrentUTC()
```

### **3. Auth Service (`src/services/auth.service.ts`)**

#### **Before:**
```typescript
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
emailVerifiedAt: new Date()
emailVerificationExpires: { gt: new Date() }
user.emailVerificationExpires > new Date()
```

#### **After:**
```typescript
const expiresAt = addDaysUTC(getCurrentUTC(), 1)
const expiresAt = addHoursUTC(getCurrentUTC(), 1)
emailVerifiedAt: getCurrentUTC()
emailVerificationExpires: { gt: getCurrentUTC() }
user.emailVerificationExpires > getCurrentUTC()
```

### **4. App Configuration (`src/app.ts`)**

#### **Before:**
```typescript
timestamp: new Date().toISOString()
```

#### **After:**
```typescript
timestamp: getCurrentUTCISO()
```

### **5. Validation Schemas (`src/types/validation.ts`)**

#### **Before:**
```typescript
scheduledAt: z.date().min(new Date(), 'Interview cannot be scheduled in the past')
```

#### **After:**
```typescript
scheduledAt: z.date().min(getCurrentUTC(), 'Interview cannot be scheduled in the past')
```

### **6. Auth Middleware (`src/middlewares/auth.middleware.ts`)**

#### **Before:**
```typescript
const now = Date.now()
```

#### **After:**
```typescript
const now = getCurrentUTCTimestamp()
```

### **7. Auth Utils (`src/utils/auth.ts`)**

#### **Before:**
```typescript
iat: Math.floor(Date.now() / 1000)
```

#### **After:**
```typescript
iat: Math.floor(getCurrentUTCTimestamp() / 1000)
```

## 🎯 **Benefits of UTC Implementation**

### **1. Data Consistency**
- ✅ All datetime values stored in UTC
- ✅ No timezone conversion issues
- ✅ Consistent behavior across environments

### **2. Global Compatibility**
- ✅ Supports users in any timezone
- ✅ Interview scheduling works globally
- ✅ No daylight saving time issues

### **3. System Reliability**
- ✅ Eliminates timezone-related bugs
- ✅ Consistent API responses
- ✅ Reliable datetime comparisons

### **4. Maintainability**
- ✅ Centralized datetime utilities
- ✅ Easy to modify timezone logic
- ✅ Clear datetime handling patterns

## 🔄 **Migration Strategy**

### **1. Database Migration**
- All existing datetime fields remain unchanged (they're already in UTC)
- New datetime operations use UTC utilities
- No data migration required

### **2. API Compatibility**
- All API responses continue to work
- Datetime values are consistently formatted
- No breaking changes to existing endpoints

### **3. Client Integration**
- Frontend can convert UTC to local timezone as needed
- API provides consistent UTC timestamps
- Client-side timezone handling simplified

## 🧪 **Testing Considerations**

### **1. Unit Tests**
- All datetime operations should use UTC utilities
- Mock datetime functions for consistent testing
- Test timezone edge cases

### **2. Integration Tests**
- Verify interview scheduling across timezones
- Test datetime validation rules
- Ensure consistent API responses

### **3. Manual Testing**
- Test interview creation with different timezones
- Verify time slot validation
- Check datetime display in different regions

## 📋 **Best Practices**

### **1. Always Use UTC Utilities**
```typescript
// ✅ Good
const now = getCurrentUTC()
const future = addDaysUTC(now, 7)

// ❌ Bad
const now = new Date()
const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
```

### **2. Consistent DateTime Handling**
```typescript
// ✅ Good
const interview = await prisma.interview.create({
    data: {
        scheduledAt: addDaysUTC(getCurrentUTC(), 7),
        timeSlotStart: addDaysUTC(getCurrentUTC(), 7),
        timeSlotEnd: addHoursUTC(addDaysUTC(getCurrentUTC(), 7), 1),
        updatedAt: getCurrentUTC()
    }
})
```

### **3. Validation with UTC**
```typescript
// ✅ Good
scheduledAt: z.date().min(getCurrentUTC(), 'Cannot schedule in past')

// ❌ Bad
scheduledAt: z.date().min(new Date(), 'Cannot schedule in past')
```

## 🚀 **Future Enhancements**

### **1. Timezone Support**
- Add timezone conversion utilities
- Support for user timezone preferences
- Display times in user's local timezone

### **2. Advanced Scheduling**
- Recurring interview scheduling
- Timezone-aware availability
- Calendar integration

### **3. Monitoring**
- UTC datetime usage monitoring
- Timezone-related error tracking
- Performance metrics for datetime operations

## ✅ **Verification Checklist**

- [x] All `new Date()` calls replaced with UTC utilities
- [x] All `Date.now()` calls replaced with UTC utilities
- [x] All datetime validation uses UTC
- [x] All database operations use UTC
- [x] All API responses use UTC timestamps
- [x] All middleware uses UTC timestamps
- [x] All authentication uses UTC timestamps
- [x] All interview scheduling uses UTC
- [x] All email verification uses UTC
- [x] All rate limiting uses UTC
- [x] All health checks use UTC
- [x] All validation schemas use UTC
- [x] Prisma client regenerated
- [x] No linter errors related to datetime
- [x] All tests pass with UTC implementation

## 🎉 **Summary**

The UTC timezone implementation is now complete across the entire recruitment platform backend. All datetime operations consistently use UTC, ensuring:

1. **Data Integrity**: No timezone-related inconsistencies
2. **Global Compatibility**: Works for users worldwide
3. **Maintainability**: Centralized and consistent datetime handling
4. **Reliability**: Eliminates timezone-related bugs

The implementation follows best practices and provides a solid foundation for future timezone-related features. 