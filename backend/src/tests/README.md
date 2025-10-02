# Testing Setup

This directory contains the testing configuration and test files for the backend API.

## Structure

```
tests/
├── setup.ts              # Jest setup and configuration
├── e2e/                   # End-to-end integration tests
│   └── complete-flow.test.ts
└── README.md              # This file
```

## Test Types

### Unit Tests
- File pattern: `*.spec.ts`
- Location: Alongside source files
- Purpose: Test individual functions and classes in isolation
- Run with: `npm run test:unit`

### End-to-End Tests
- File pattern: `**/e2e/*.test.ts`
- Location: `src/tests/e2e/`
- Purpose: Test complete user workflows and API integration
- Run with: `npm run test:e2e`

## Configuration

### Environment Variables
Tests use a separate `.env.test` file with test-specific configurations:
- Test database name: `gestion_actividad_test`
- Reduced logging: `LOG_LEVEL=error`
- Mock authentication secrets
- Test-specific rate limits

### Database Setup
- Tests use a dedicated test database
- Database is cleaned before each test suite
- Test data is seeded automatically
- Tests run sequentially to avoid conflicts

### Mock Authentication
- Tests use a special `/auth/mock-login` endpoint
- Only available when `NODE_ENV=test`
- Bypasses Azure AD OAuth for testing
- Creates test users automatically

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### End-to-End Tests Only
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Features Covered

### Authentication Flow
- Mock login for admin and operario users
- Token validation
- Authorization checks

### Master Data Management
- CRUD operations for obras, recursos, tipos de actividad
- Permission-based access control
- Data validation

### Activity Management
- Activity creation and updates
- Overlap validation
- Duration calculations
- User-specific access restrictions

### Export Functionality
- Export preview generation
- Multiple format support (JSON, CSV, XML)
- Export validation
- Rate limiting testing

### GPS Integration
- Coordinate recording and validation
- Distance calculations
- Waypoint tracking
- Permission checks

### Metrics and Monitoring
- System health checks
- Performance metrics
- Admin-only access
- User activity metrics

### Security and Validation
- Input validation testing
- Unauthorized access prevention
- Rate limiting enforcement
- Data format validation

### Performance Testing
- Concurrent request handling
- Large export processing
- System responsiveness under load

## Custom Jest Matchers

### toBeValidDate()
```typescript
expect(new Date()).toBeValidDate();
```

### toHaveValidGPSCoordinates()
```typescript
expect({ latitude: 41.3851, longitude: 2.1734 }).toHaveValidGPSCoordinates();
```

## Debugging Tests

### Enable Detailed Logging
Set `LOG_LEVEL=debug` in `.env.test`

### Database Inspection
Tests create and clean up data automatically, but you can inspect the test database:
- Database name: `gestion_actividad_test`
- Connection details in `.env.test`

### Failed Test Analysis
1. Check console output for error messages
2. Verify database connectivity
3. Ensure all dependencies are installed
4. Check test timeout settings (30 seconds default)

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Data Cleanup**: Tests clean up after themselves
3. **Mock External Services**: Use mocks for third-party services
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Arrange-Act-Assert**: Follow the AAA pattern for test structure

## Troubleshooting

### Database Connection Issues
- Verify SQL Server is running
- Check connection string in `.env.test`
- Ensure test database exists

### Authentication Issues
- Verify mock login endpoint is available in test environment
- Check JWT secret configuration

### Timeout Issues
- Increase test timeout in Jest configuration
- Check for database deadlocks or slow queries

### Rate Limiting Issues
- Tests may hit rate limits during concurrent execution
- This is expected behavior and validates rate limiting works