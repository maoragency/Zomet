# Database Services Layer

This directory contains the complete database service layer for the Zomet vehicle marketplace application, providing CRUD operations and comprehensive error handling for all Supabase database interactions.

## Overview

The database services layer provides:
- **Standardized API**: Consistent interface for all database operations
- **Comprehensive Error Handling**: Hebrew error messages and proper error logging
- **Input Validation**: Required field validation and data sanitization
- **Type Safety**: Well-documented function signatures and return types
- **Performance Optimization**: Efficient queries with proper indexing support

## Services

### 1. Vehicle Service (`vehicles.js`)
Handles all vehicle-related database operations.

**Key Features:**
- Vehicle CRUD operations (Create, Read, Update, Delete)
- Advanced search and filtering
- Sorting and pagination
- View count tracking
- User-specific vehicle listings

**Example Usage:**
```javascript
import { vehicleService } from '@/services/vehicles'

// List all vehicles
const vehicles = await vehicleService.list('-created_at', 20)

// Search vehicles with filters
const searchResults = await vehicleService.search({
  category: 'רכב פרטי',
  manufacturer: 'טויוטה',
  priceRange: [50000, 150000],
  location: 'תל אביב'
})

// Create new vehicle
const newVehicle = await vehicleService.create({
  title: 'טויוטה קורולה 2020',
  type: 'רכב פרטי',
  manufacturer: 'טויוטה',
  model: 'קורולה',
  year: 2020,
  price: 85000,
  contact_name: 'יוסי כהן',
  contact_phone: '0501234567'
})
```

### 2. User Service (`users.js`)
Manages user profiles and user-related operations.

**Key Features:**
- User profile management
- Authentication integration
- Profile validation
- User statistics
- Admin functions

**Example Usage:**
```javascript
import { userService } from '@/services/users'

// Get current user profile
const currentUser = await userService.me()

// Update user profile
const updatedProfile = await userService.updateProfile({
  full_name: 'יוסי כהן',
  phone: '0501234567'
})

// Get user statistics
const stats = await userService.getUserStats()
```

### 3. Buyer Request Service (`buyerRequests.js`)
Handles buyer inquiry functionality.

**Key Features:**
- Buyer request CRUD operations
- Status management (active, closed, completed)
- Search and filtering
- User-specific requests

**Example Usage:**
```javascript
import { buyerRequestService } from '@/services/buyerRequests'

// Create buyer request
const request = await buyerRequestService.create({
  title: 'מחפש טויוטה קורולה',
  description: 'מחפש רכב אמין לשימוש יומיומי',
  budget_min: 60000,
  budget_max: 100000,
  contact_name: 'שרה לוי',
  contact_phone: '0507654321'
})

// Get active requests
const activeRequests = await buyerRequestService.getActive(10)
```

### 4. Pricing Plan Service (`pricingPlans.js`)
Manages subscription plans and pricing.

**Key Features:**
- Pricing plan management
- Active/inactive plan filtering
- Feature-based search
- Admin operations

**Example Usage:**
```javascript
import { pricingPlanService } from '@/services/pricingPlans'

// Get all active plans
const plans = await pricingPlanService.list(true)

// Create new plan (admin only)
const newPlan = await pricingPlanService.create({
  name: 'תוכנית פרימיום',
  price: 99,
  features: ['פרסום מודגש', 'תמיכה מועדפת'],
  duration_days: 30
})
```

### 5. Authentication Service (`auth.js`)
Handles user authentication and session management.

### 6. Storage Service (`storage.js`)
Manages file uploads and storage operations.

## Error Handling

All services use comprehensive error handling with Hebrew error messages:

```javascript
// All service methods return standardized responses
const result = await vehicleService.create(vehicleData)

if (result.success) {
  console.log('Vehicle created:', result.data)
  console.log('Success message:', result.message) // Hebrew message
} else {
  console.error('Error:', result.error.message) // Hebrew error message
  console.error('Error code:', result.error.code)
  console.error('Details:', result.error.details)
}
```

### Error Types

- **Authentication Errors**: Invalid credentials, expired sessions
- **Validation Errors**: Missing required fields, invalid formats
- **Database Errors**: Constraint violations, connection issues
- **Network Errors**: Connection timeouts, server errors

## Validation

Input validation is performed automatically:

```javascript
// Required field validation
const vehicleData = {
  title: 'Test Vehicle'
  // Missing required fields: type, manufacturer, model, price, contact_name, contact_phone
}

const result = await vehicleService.create(vehicleData)
// Returns validation error with details about missing fields
```

## Database Utilities

Additional utilities are available in `dbUtils.js`:

### Generic CRUD Operations
```javascript
import { genericCrud } from '@/services/dbUtils'

// Generic operations for any table
const users = await genericCrud.list('users', {
  filters: { is_active: true },
  orderBy: 'created_at',
  limit: 50
})
```

### Query Builder
```javascript
import { queryBuilder } from '@/services/dbUtils'

// Build complex queries
let query = supabase.from('vehicles').select('*')
query = queryBuilder.applyFilters(query, filters)
query = queryBuilder.applySorting(query, '-created_at')
query = queryBuilder.applyPagination(query, 1, 20)
```

### Analytics
```javascript
import { analytics } from '@/services/dbUtils'

// Get table statistics
const vehicleCount = await analytics.getCount('vehicles', { status: 'למכירה' })
const priceStats = await analytics.getAggregates('vehicles', 'price', ['avg', 'min', 'max'])
```

## Usage Patterns

### 1. Unified Database Access
```javascript
import { db } from '@/services'

// Access all services through unified interface
const vehicles = await db.vehicles.list()
const user = await db.users.me()
const requests = await db.buyerRequests.getActive()
```

### 2. Error Handling with Utilities
```javascript
import { errorUtils } from '@/services'

// Use error handling utilities
const result = errorUtils.withErrorHandling(
  () => vehicleService.create(data),
  'vehicle creation'
)
```

### 3. Batch Operations
```javascript
import { batch } from '@/services'

// Execute multiple operations
const operations = [
  () => vehicleService.create(vehicle1),
  () => vehicleService.create(vehicle2),
  () => userService.updateProfile(updates)
]

const results = await batch.execute(operations)
```

## Testing

Comprehensive test suite is available in `__tests__/services.test.js`:

```bash
# Run service tests
npm run test src/services/__tests__/services.test.js
```

## Performance Considerations

- **Pagination**: All list operations support pagination to prevent large data loads
- **Indexing**: Queries are optimized for database indexes
- **Caching**: Consider implementing caching for frequently accessed data
- **Batch Operations**: Use batch operations for multiple related changes

## Security

- **Input Sanitization**: All text inputs are sanitized to prevent XSS
- **Authentication**: User authentication is verified for protected operations
- **Authorization**: Row Level Security (RLS) policies enforce data access rules
- **Validation**: Comprehensive input validation prevents invalid data

## Migration from Base44

This service layer replaces the Base44 SDK with equivalent functionality:

| Base44 Method | New Service Method |
|---------------|-------------------|
| `Vehicle.list()` | `vehicleService.list()` |
| `Vehicle.create()` | `vehicleService.create()` |
| `User.me()` | `userService.me()` |
| `BuyerRequest.create()` | `buyerRequestService.create()` |

## Environment Configuration

Ensure these environment variables are set:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

When adding new service methods:

1. Follow the existing pattern for error handling
2. Add input validation for required fields
3. Sanitize text inputs
4. Include comprehensive JSDoc comments
5. Add tests for new functionality
6. Update this README with usage examples

## Support

For issues or questions about the database services:

1. Check the error logs for detailed error information
2. Verify environment configuration
3. Test database connectivity with `healthCheck()`
4. Review the test suite for usage examples