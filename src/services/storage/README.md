# File Storage and Upload System

This document describes the comprehensive file storage and upload system implemented for the Zomet vehicle marketplace application using Supabase Storage.

## Overview

The file storage system provides:
- **Image optimization and compression** - Automatic image resizing and quality optimization
- **Thumbnail generation** - Automatic thumbnail creation for images
- **Progress tracking** - Real-time upload progress with detailed stages
- **File validation** - Comprehensive validation including magic byte checking
- **Access controls** - Row Level Security policies for secure file access
- **Drag and drop support** - Modern file upload interface
- **Multiple file uploads** - Batch upload with individual progress tracking

## Architecture

### Core Components

1. **Storage Service** (`src/services/storage.js`) - Main service for file operations
2. **Upload Hook** (`src/hooks/useFileUpload.js`) - React hook for upload state management
3. **Upload Component** (`src/components/ui/ImageUpload.jsx`) - Complete upload UI component
4. **Image Utilities** (`src/utils/imageUpload.js`) - Image processing and utility functions
5. **Storage Configuration** (`src/utils/storageConfig.js`) - Bucket setup and access control

### Storage Buckets

The system uses three main storage buckets:

- **`vehicle-images`** - Public bucket for vehicle photos (10MB limit)
- **`vehicle-documents`** - Private bucket for vehicle documents (5MB limit)
- **`user-avatars`** - Public bucket for user profile pictures (2MB limit)

## Usage Examples

### Basic File Upload

```jsx
import { storageService } from '@/services/storage'

// Upload a single file
const handleFileUpload = async (file) => {
  try {
    const result = await storageService.uploadFile(file, null, {
      optimize: true,
      generateThumbnail: true
    })
    
    console.log('Upload successful:', result.publicUrl)
    console.log('Thumbnail:', result.thumbnail?.publicUrl)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

### Upload with Progress Tracking

```jsx
import { storageService } from '@/services/storage'

const handleUploadWithProgress = async (file) => {
  const progressCallback = (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`)
  }

  try {
    const result = await storageService.uploadFile(
      file, 
      null, 
      { optimize: true }, 
      progressCallback
    )
    console.log('Upload complete:', result)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

### Using the Upload Hook

```jsx
import { useFileUpload } from '@/hooks/useFileUpload'

const MyComponent = () => {
  const {
    uploadFile,
    isUploading,
    progress,
    stage,
    error,
    results
  } = useFileUpload({
    optimize: true,
    generateThumbnail: true,
    validationConstraints: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png']
    }
  })

  const handleFileSelect = async (file) => {
    try {
      const result = await uploadFile(file)
      console.log('Upload successful:', result)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => handleFileSelect(e.target.files[0])}
        disabled={isUploading}
      />
      {isUploading && (
        <div>
          <p>Stage: {stage}</p>
          <p>Progress: {progress}%</p>
        </div>
      )}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

### Complete Upload Component

```jsx
import ImageUpload from '@/components/ui/ImageUpload'

const VehicleForm = () => {
  const handleUploadComplete = (results) => {
    console.log('All uploads complete:', results)
    // Update form state with uploaded image URLs
  }

  const handleUploadError = (error) => {
    console.error('Upload error:', error)
    // Show error message to user
  }

  return (
    <ImageUpload
      multiple={true}
      maxFiles={10}
      acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
      maxSize={10 * 1024 * 1024} // 10MB
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
      optimize={true}
      generateThumbnail={true}
      showPreview={true}
      showProgress={true}
    />
  )
}
```

### File Validation

```jsx
import { storageService } from '@/services/storage'

const validateFiles = async (files) => {
  for (const file of files) {
    const validation = await storageService.validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 4000,
      maxHeight: 4000,
      checkMagicBytes: true
    })

    if (!validation.isValid) {
      console.error(`File ${file.name} validation failed:`, validation.errors)
      return false
    }
  }
  return true
}
```

### Storage Configuration

```jsx
import { storageConfigUtils, STORAGE_BUCKETS } from '@/utils/storageConfig'

// Initialize storage buckets
const initializeStorage = async () => {
  const results = await storageConfigUtils.initializeStorageBuckets()
  console.log('Bucket initialization results:', results)
}

// Validate file for specific bucket
const validateForBucket = (file, bucketName) => {
  const validation = storageConfigUtils.validateFileForBucket(file, bucketName)
  if (!validation.isValid) {
    console.error('Validation errors:', validation.errors)
    return false
  }
  return true
}

// Generate secure file path
const generatePath = (userId, filename) => {
  return storageConfigUtils.generateSecureFilePath(
    userId,
    'vehicle-images',
    filename,
    {
      category: 'listings',
      includeTimestamp: true,
      includeRandom: true
    }
  )
}
```

## Image Processing Features

### Automatic Optimization

Images are automatically optimized during upload:
- **Compression**: JPEG quality set to 85% for optimal size/quality balance
- **Resizing**: Large images resized to maximum 1920x1080 pixels
- **Format conversion**: All images converted to JPEG for consistency

### Thumbnail Generation

Thumbnails are automatically generated:
- **Size**: 300x200 pixels with aspect ratio preservation
- **Quality**: 70% JPEG compression for fast loading
- **Naming**: Thumbnails saved with `_thumb` suffix

### Manual Image Processing

```jsx
import { imageProcessingUtils } from '@/utils/imageUpload'

// Rotate image
const rotatedFile = await imageProcessingUtils.rotateImage(file, 90)

// Crop image
const croppedFile = await imageProcessingUtils.cropImage(file, {
  x: 100,
  y: 100,
  width: 400,
  height: 300
})
```

## Security Features

### Row Level Security (RLS)

All storage buckets have RLS policies that ensure:
- Users can only access their own files
- Public buckets allow read access to all users
- Private buckets restrict access to file owners only

### File Validation

Comprehensive validation includes:
- **File size limits** - Configurable per bucket
- **MIME type checking** - Only allowed file types accepted
- **Magic byte validation** - Ensures file integrity
- **Dimension limits** - Maximum image dimensions enforced
- **Extension validation** - File extensions must match MIME types

### Access Control

```jsx
import { storageConfigUtils } from '@/utils/storageConfig'

// Check if user has access to file
const hasAccess = storageConfigUtils.checkUserAccess(userId, filePath)

// Get user storage usage
const usage = await storageConfigUtils.getUserStorageUsage(userId)
console.log('Storage usage:', usage)
```

## Error Handling

The system provides comprehensive error handling:

```jsx
try {
  const result = await storageService.uploadFile(file)
} catch (error) {
  if (error.message.includes('File validation failed')) {
    // Handle validation errors
    console.error('Validation error:', error.message)
  } else if (error.message.includes('User must be authenticated')) {
    // Handle authentication errors
    console.error('Authentication required')
  } else {
    // Handle other upload errors
    console.error('Upload error:', error.message)
  }
}
```

## Performance Optimization

### Image Compression

Images are automatically compressed to reduce file size while maintaining quality:
- Large images are resized to reasonable dimensions
- JPEG quality is optimized for web delivery
- Thumbnails are generated for fast preview loading

### Batch Operations

Multiple files can be uploaded efficiently:
- Files are processed in sequence to avoid overwhelming the server
- Progress tracking provides feedback for each file
- Failed uploads don't affect successful ones

### Caching

The system implements caching strategies:
- Public URLs are cached with appropriate headers
- Thumbnails are cached for fast loading
- File metadata is cached to reduce API calls

## Testing

Run the test suite to verify functionality:

```bash
npm run test src/services/__tests__/storage.test.js
```

The test suite covers:
- File upload functionality
- Validation logic
- Error handling
- Multiple file uploads
- Image processing
- Magic byte validation

## Environment Setup

Ensure your `.env` file contains the required Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Configuration

### Storage Buckets

Create the following buckets in your Supabase dashboard:

1. **vehicle-images** (Public)
2. **vehicle-documents** (Private)
3. **user-avatars** (Public)

### RLS Policies

The system includes SQL policies for Row Level Security. Apply these policies in your Supabase SQL editor to ensure proper access control.

## Troubleshooting

### Common Issues

1. **Upload fails with authentication error**
   - Ensure user is logged in before uploading
   - Check Supabase authentication configuration

2. **File validation fails**
   - Check file size limits
   - Verify file type is allowed
   - Ensure file is not corrupted

3. **Images not displaying**
   - Verify bucket is public for public images
   - Check file path and URL generation
   - Ensure proper CORS configuration

4. **Slow upload performance**
   - Consider disabling image optimization for large batches
   - Check network connection
   - Verify Supabase project limits

### Debug Mode

Enable debug logging by setting:

```javascript
// In your component or service
const DEBUG = true

if (DEBUG) {
  console.log('Upload progress:', progressInfo)
  console.log('Validation result:', validationResult)
}
```

## Best Practices

1. **Always validate files** before uploading
2. **Use progress callbacks** for better user experience
3. **Handle errors gracefully** with user-friendly messages
4. **Optimize images** to reduce storage costs
5. **Implement proper access controls** for sensitive files
6. **Clean up unused files** periodically
7. **Monitor storage usage** to avoid limits
8. **Use thumbnails** for image previews to improve performance

## API Reference

For detailed API documentation, see the JSDoc comments in the source files:
- `src/services/storage.js` - Main storage service
- `src/hooks/useFileUpload.js` - Upload hook
- `src/utils/imageUpload.js` - Image utilities
- `src/utils/storageConfig.js` - Storage configuration