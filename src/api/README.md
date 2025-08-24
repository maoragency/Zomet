# API Integrations Layer

This directory contains the enhanced API integrations layer for the Zomet vehicle marketplace application. The integrations provide a unified interface for file uploads, email services, and AI-powered features using Supabase as the backend.

## Overview

The integrations layer replaces the previous Base44 SDK with Supabase-based implementations while maintaining backward compatibility with existing component usage patterns.

## Features

- **File Upload Integration**: Enhanced file upload with image optimization, thumbnail generation, and progress tracking
- **Email Integration**: Email sending with fallback mechanisms and comprehensive validation
- **AI Integration**: LLM invocation for vehicle pricing, descriptions, and other AI-powered features
- **Error Handling**: Comprehensive error handling with retry logic and user-friendly messages
- **Health Monitoring**: System health checks for all integration services
- **Backward Compatibility**: Maintains compatibility with existing Base44 SDK usage patterns

## Files Structure

```
src/api/
├── integrations.js           # Main integrations implementation
├── integrations.config.js    # Configuration constants and settings
├── integrations.test-runner.js # Browser-based test runner
├── entities.js              # Entity classes (Vehicle, User, etc.)
├── examples/
│   └── integrations-demo.js  # Usage examples and demos
├── __tests__/
│   └── integrations.test.js  # Unit tests
└── README.md                # This file
```

## Core Functions

### File Upload Functions

#### `UploadFile({ file, path, options, onProgress })`
Uploads a single file to Supabase Storage with optimization and progress tracking.

```javascript
import { UploadFile } from '@/api/integrations'

const result = await UploadFile({
  file: selectedFile,
  options: {
    optimize: true,
    generateThumbnail: true,
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  onProgress: (progress) => {
    console.log(`Upload: ${progress.progress}% (${progress.stage})`)
  }
})

console.log('Uploaded:', result.file_url)
```

#### `UploadMultipleFiles({ files, folderPath, options, onProgress })`
Uploads multiple files with batch processing and progress tracking.

```javascript
const results = await UploadMultipleFiles({
  files: fileList,
  folderPath: 'vehicles',
  options: { optimize: true },
  onProgress: (progress) => {
    console.log(`${progress.currentFile}/${progress.totalFiles}: ${progress.overallProgress}%`)
  }
})
```

### Email Functions

#### `SendEmail({ to, subject, message, from, replyTo, options })`
Sends emails via Supabase Edge Functions with fallback support.

```javascript
import { SendEmail } from '@/api/integrations'

const result = await SendEmail({
  to: 'customer@example.com',
  subject: 'Vehicle Inquiry',
  message: 'Thank you for your interest...',
  replyTo: 'sales@zomet.co.il'
})
```

### AI Functions

#### `InvokeLLM({ prompt, add_context_from_internet, model, context, options })`
Invokes AI models for various tasks with intelligent fallback responses.

```javascript
import { InvokeLLM } from '@/api/integrations'

const result = await InvokeLLM({
  prompt: 'Estimate the price of this vehicle...',
  add_context_from_internet: true,
  context: {
    vehicle: { year: 2020, manufacturer: 'Toyota', model: 'Camry' }
  }
})

console.log('AI Response:', result.response)
```

### File Management Functions

#### `DeleteFile({ path, options })`
Deletes a single file from storage.

#### `DeleteMultipleFiles({ paths, options })`
Deletes multiple files in batch.

#### `GetFileUrl({ path })`
Gets public URL for a file.

#### `GetSignedUrl({ path, expiresIn })`
Gets signed URL for private file access.

### Utility Functions

#### `HealthCheck()`
Performs system health check for all integration services.

```javascript
import { HealthCheck } from '@/api/integrations'

const health = await HealthCheck()
console.log('System healthy:', health.healthy)
console.log('Services:', health.checks)
```

## Configuration

The integrations use centralized configuration from `integrations.config.js`:

```javascript
import { UPLOAD_CONFIG, EMAIL_CONFIG, LLM_CONFIG } from '@/api/integrations.config'

// File upload limits
console.log('Max file size:', UPLOAD_CONFIG.MAX_FILE_SIZE)

// Email settings
console.log('Default sender:', EMAIL_CONFIG.DEFAULT_FROM)

// AI model settings
console.log('Default model:', LLM_CONFIG.DEFAULT_MODEL)
```

## Error Handling

All functions implement comprehensive error handling with:

- **Validation**: Input parameter validation
- **Retry Logic**: Automatic retry with exponential backoff
- **Fallback Mechanisms**: Graceful degradation when services are unavailable
- **Enhanced Error Messages**: User-friendly error messages in Hebrew
- **Error Context**: Additional context for debugging

```javascript
try {
  const result = await UploadFile({ file: myFile })
} catch (error) {
  console.error('Upload failed:', error.message)
  console.error('Error context:', error.context)
  console.error('Original error:', error.originalError)
}
```

## Testing

### Unit Tests
Run unit tests with a testing framework:
```bash
# Note: Add test script to package.json first
npm test src/api/__tests__/integrations.test.js
```

### Browser Testing
Use the test runner in browser console:
```javascript
// In browser console after loading the app
runIntegrationTests()
```

### Manual Testing
Use the examples in `examples/integrations-demo.js` for manual testing:
```javascript
import { uploadSingleFileExample } from '@/api/examples/integrations-demo'

await uploadSingleFileExample()
```

## Environment Setup

Ensure these environment variables are set:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_ENV=development
```

## Edge Functions

The integrations can use Supabase Edge Functions for:

1. **Email Service** (`send-email`): Handles email sending with external providers
2. **AI Service** (`invoke-llm`): Handles AI model invocations
3. **Health Check** (`health-check`): Service health monitoring

If Edge Functions are not available, the integrations gracefully fall back to stub implementations.

## Migration from Base44

The integrations maintain backward compatibility with Base44 SDK patterns:

```javascript
// Old Base44 usage (still works)
import { UploadFile } from '@/api/integrations'
const result = await UploadFile({ file: myFile })
console.log(result.file_url) // Compatible response format

// New enhanced usage
const result = await UploadFile({ 
  file: myFile,
  options: { optimize: true },
  onProgress: (p) => console.log(p.progress)
})
```

## Performance Considerations

- **Image Optimization**: Automatic image compression and resizing
- **Thumbnail Generation**: Automatic thumbnail creation for images
- **Batch Operations**: Efficient batch processing for multiple files
- **Caching**: Proper cache headers for uploaded files
- **Progress Tracking**: Real-time progress updates for long operations

## Security Features

- **File Validation**: Comprehensive file type and size validation
- **Magic Byte Checking**: Validates file integrity using magic bytes
- **Email Validation**: RFC-compliant email address validation
- **Path Sanitization**: Prevents path traversal attacks
- **Signed URLs**: Secure access to private files
- **Rate Limiting**: (Configurable) Request rate limiting

## Troubleshooting

### Common Issues

1. **Upload Failures**: Check file size limits and allowed types
2. **Email Not Sending**: Verify Edge Function deployment and email service configuration
3. **AI Responses**: Check prompt length and context data
4. **Health Check Failures**: Verify Supabase connection and credentials

### Debug Mode

Enable debug logging in development:
```javascript
// Set in environment or config
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### Support

For issues and questions:
- Check the examples in `examples/integrations-demo.js`
- Run the health check: `await HealthCheck()`
- Review error logs with context information
- Test individual functions with the browser test runner

## Future Enhancements

Planned improvements:
- Real-time upload progress via WebSockets
- Advanced AI context management
- Email template system
- File versioning and history
- Advanced caching strategies
- Metrics and analytics integration