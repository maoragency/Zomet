/**
 * Storage configuration utilities for Supabase Storage
 * Handles bucket setup, access controls, and storage policies
 */

import { supabase } from '@/lib/supabase'

/**
 * Storage bucket configurations
 */
export const STORAGE_BUCKETS = {
  VEHICLE_IMAGES: {
    name: 'vehicle-images',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif']
  },
  VEHICLE_DOCUMENTS: {
    name: 'vehicle-documents',
    public: false,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedFileExtensions: ['pdf', 'jpg', 'jpeg', 'png']
  },
  USER_AVATARS: {
    name: 'user-avatars',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp']
  }
}

/**
 * Storage policies for Row Level Security
 */
export const STORAGE_POLICIES = {
  // Vehicle images - public read, authenticated users can upload their own
  VEHICLE_IMAGES_SELECT: `
    CREATE POLICY "Public can view vehicle images" ON storage.objects
    FOR SELECT USING (bucket_id = 'vehicle-images');
  `,

  VEHICLE_IMAGES_INSERT: `
    CREATE POLICY "Authenticated users can upload vehicle images" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'vehicle-images' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  VEHICLE_IMAGES_UPDATE: `
    CREATE POLICY "Users can update their own vehicle images" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'vehicle-images' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  VEHICLE_IMAGES_DELETE: `
    CREATE POLICY "Users can delete their own vehicle images" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'vehicle-images' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  // User avatars - public read, users can manage their own
  USER_AVATARS_SELECT: `
    CREATE POLICY "Public can view user avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');
  `,

  USER_AVATARS_INSERT: `
    CREATE POLICY "Users can upload their own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'user-avatars' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  USER_AVATARS_UPDATE: `
    CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'user-avatars' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  USER_AVATARS_DELETE: `
    CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'user-avatars' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  // Vehicle documents - private, only owners can access
  VEHICLE_DOCUMENTS_SELECT: `
    CREATE POLICY "Users can view their own vehicle documents" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'vehicle-documents' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  VEHICLE_DOCUMENTS_INSERT: `
    CREATE POLICY "Users can upload their own vehicle documents" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'vehicle-documents' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  VEHICLE_DOCUMENTS_UPDATE: `
    CREATE POLICY "Users can update their own vehicle documents" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'vehicle-documents' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `,

  VEHICLE_DOCUMENTS_DELETE: `
    CREATE POLICY "Users can delete their own vehicle documents" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'vehicle-documents' 
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `
}

/**
 * Storage configuration utilities
 */
export const storageConfigUtils = {
  /**
   * Create storage bucket if it doesn't exist
   * @param {string} bucketName - Name of the bucket to create
   * @param {Object} config - Bucket configuration
   * @returns {Promise<boolean>} Success status
   */
  async createBucket(bucketName, config = {}) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: config.public || false,
        allowedMimeTypes: config.allowedMimeTypes,
        fileSizeLimit: config.fileSizeLimit
      })

      if (error && !error.message.includes('already exists')) {
        throw error
      }

      return true
    } catch (error) {
      console.error(`Failed to create bucket ${bucketName}:`, error)
      return false
    }
  },

  /**
   * Initialize all required storage buckets
   * @returns {Promise<Object>} Initialization results
   */
  async initializeStorageBuckets() {
    const results = {}

    for (const [key, config] of Object.entries(STORAGE_BUCKETS)) {
      results[key] = await this.createBucket(config.name, config)
    }

    return results
  },

  /**
   * Get bucket configuration by name
   * @param {string} bucketName - Bucket name
   * @returns {Object|null} Bucket configuration
   */
  getBucketConfig(bucketName) {
    return Object.values(STORAGE_BUCKETS).find(config => config.name === bucketName) || null
  },

  /**
   * Validate file against bucket constraints
   * @param {File} file - File to validate
   * @param {string} bucketName - Target bucket name
   * @returns {Object} Validation result
   */
  validateFileForBucket(file, bucketName) {
    const config = this.getBucketConfig(bucketName)
    if (!config) {
      return { isValid: false, errors: ['Invalid bucket name'] }
    }

    const errors = []

    // Check file size
    if (file.size > config.fileSizeLimit) {
      errors.push(`File size exceeds limit of ${config.fileSizeLimit / 1024 / 1024}MB`)
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed for this bucket`)
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!config.allowedFileExtensions.includes(extension)) {
      errors.push(`File extension .${extension} not allowed for this bucket`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      config
    }
  },

  /**
   * Generate secure file path with user isolation
   * @param {string} userId - User ID
   * @param {string} bucketName - Bucket name
   * @param {string} filename - Original filename
   * @param {Object} options - Path generation options
   * @returns {string} Secure file path
   */
  generateSecureFilePath(userId, bucketName, filename, options = {}) {
    const {
      category = 'general',
      includeTimestamp = true,
      includeRandom = true,
      preserveOriginalName = false
    } = options

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = filename.split('.').pop()?.toLowerCase()

    let baseName
    if (preserveOriginalName) {
      baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')
    } else {
      baseName = includeRandom ? randomString : 'file'
    }

    const pathComponents = [userId, category]

    if (includeTimestamp) {
      const date = new Date()
      pathComponents.push(
        date.getFullYear().toString(),
        (date.getMonth() + 1).toString().padStart(2, '0')
      )
    }

    const fileName = [
      includeTimestamp ? timestamp : null,
      baseName
    ].filter(Boolean).join('-') + '.' + fileExtension

    pathComponents.push(fileName)

    return pathComponents.join('/')
  },

  /**
   * Check if user has access to file path
   * @param {string} userId - User ID
   * @param {string} filePath - File path to check
   * @returns {boolean} Access permission
   */
  checkUserAccess(userId, filePath) {
    const pathParts = filePath.split('/')
    return pathParts[0] === userId
  },

  /**
   * Get storage usage statistics for user
   * @param {string} userId - User ID
   * @param {string} bucketName - Bucket name (optional)
   * @returns {Promise<Object>} Usage statistics
   */
  async getUserStorageUsage(userId, bucketName = null) {
    try {
      const buckets = bucketName ? [bucketName] : Object.values(STORAGE_BUCKETS).map(b => b.name)
      const usage = {}

      for (const bucket of buckets) {
        const { data: files, error } = await supabase.storage
          .from(bucket)
          .list(userId, { limit: 1000 })

        if (error) {
          console.error(`Error getting usage for bucket ${bucket}:`, error)
          continue
        }

        const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
        const fileCount = files?.length || 0

        usage[bucket] = {
          totalSize,
          fileCount,
          formattedSize: this.formatBytes(totalSize)
        }
      }

      return usage
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return {}
    }
  },

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * Clean up old files (utility for maintenance)
   * @param {string} userId - User ID
   * @param {string} bucketName - Bucket name
   * @param {number} daysOld - Files older than this many days
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupOldFiles(userId, bucketName, daysOld = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data: files, error } = await supabase.storage
        .from(bucketName)
        .list(userId, { limit: 1000 })

      if (error) throw error

      const oldFiles = files.filter(file =>
        new Date(file.created_at) < cutoffDate
      )

      const filePaths = oldFiles.map(file => `${userId}/${file.name}`)

      if (filePaths.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove(filePaths)

        if (deleteError) throw deleteError
      }

      return {
        success: true,
        deletedCount: filePaths.length,
        deletedFiles: filePaths
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export default storageConfigUtils