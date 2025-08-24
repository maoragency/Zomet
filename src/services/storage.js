import { supabase } from '@/lib/supabase'

/**
 * Storage service for Supabase Storage operations
 * Handles file uploads, downloads, and management with image optimization and progress tracking
 */

// Image optimization utilities
const imageUtils = {
  /**
   * Compress and resize image
   * @param {File} file - Image file to compress
   * @param {Object} options - Compression options
   * @returns {Promise<File>} Compressed image file
   */
  async compressImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: `image/${format}`,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          `image/${format}`,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Generate thumbnail from image
   * @param {File} file - Image file
   * @param {Object} options - Thumbnail options
   * @returns {Promise<File>} Thumbnail file
   */
  async generateThumbnail(file, options = {}) {
    const {
      width = 300,
      height = 200,
      quality = 0.7,
      format = 'jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = width
        canvas.height = height

        // Calculate crop dimensions to maintain aspect ratio
        const imgRatio = img.width / img.height
        const canvasRatio = width / height

        let drawWidth, drawHeight, offsetX = 0, offsetY = 0

        if (imgRatio > canvasRatio) {
          // Image is wider
          drawHeight = height
          drawWidth = height * imgRatio
          offsetX = (width - drawWidth) / 2
        } else {
          // Image is taller
          drawWidth = width
          drawHeight = width / imgRatio
          offsetY = (height - drawHeight) / 2
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                type: `image/${format}`,
                lastModified: Date.now()
              })
              resolve(thumbnailFile)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          },
          `image/${format}`,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'))
      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Get image dimensions
   * @param {File} file - Image file
   * @returns {Promise<Object>} Image dimensions
   */
  async getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }
}

export const storageService = {
  /**
   * Upload a file to Supabase Storage with optimization and progress tracking
   * @param {File} file - File to upload
   * @param {string} path - Storage path (optional, will generate if not provided)
   * @param {Object} options - Upload options
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Object>} Upload result with public URL and metadata
   */
  async uploadFile(file, path = null, options = {}, onProgress = null) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to upload files')

      const {
        optimize = true,
        generateThumbnail = true,
        compressionOptions = {},
        thumbnailOptions = {},
        bucket = 'vehicle-images',
        ...uploadOptions
      } = options

      // Validate file
      const validation = await this.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      })

      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
      }

      // Generate path if not provided
      if (!path) {
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop()
        path = `${user.id}/${timestamp}-${randomString}.${fileExtension}`
      }

      let fileToUpload = file
      let thumbnailFile = null
      let originalDimensions = null

      // Get original image dimensions
      if (file.type.startsWith('image/')) {
        originalDimensions = await imageUtils.getImageDimensions(file)
      }

      // Optimize image if requested and it's an image file
      if (optimize && file.type.startsWith('image/')) {
        if (onProgress) onProgress({ stage: 'optimizing', progress: 10 })
        
        fileToUpload = await imageUtils.compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          format: 'jpeg',
          ...compressionOptions
        })

        if (onProgress) onProgress({ stage: 'optimizing', progress: 30 })
      }

      // Generate thumbnail if requested
      if (generateThumbnail && file.type.startsWith('image/')) {
        if (onProgress) onProgress({ stage: 'thumbnail', progress: 40 })
        
        thumbnailFile = await imageUtils.generateThumbnail(fileToUpload, {
          width: 300,
          height: 200,
          quality: 0.7,
          format: 'jpeg',
          ...thumbnailOptions
        })

        if (onProgress) onProgress({ stage: 'thumbnail', progress: 50 })
      }

      // Upload main file
      if (onProgress) onProgress({ stage: 'uploading', progress: 60 })

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          ...uploadOptions
        })

      if (error) throw error

      if (onProgress) onProgress({ stage: 'uploading', progress: 80 })

      // Upload thumbnail if generated
      let thumbnailData = null
      if (thumbnailFile) {
        const thumbnailPath = path.replace(/\.[^/.]+$/, '_thumb.jpg')
        
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from(bucket)
          .upload(thumbnailPath, thumbnailFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (!thumbError) {
          thumbnailData = {
            path: thumbData.path,
            publicUrl: supabase.storage.from(bucket).getPublicUrl(thumbData.path).data.publicUrl
          }
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      if (onProgress) onProgress({ stage: 'complete', progress: 100 })

      return {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl,
        file_url: publicUrl, // For compatibility with existing code
        thumbnail: thumbnailData,
        metadata: {
          originalSize: file.size,
          optimizedSize: fileToUpload.size,
          compressionRatio: file.size > 0 ? (1 - fileToUpload.size / file.size) : 0,
          originalDimensions,
          mimeType: fileToUpload.type,
          uploadedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Upload file error:', error)
      if (onProgress) onProgress({ stage: 'error', progress: 0, error: error.message })
      throw error
    }
  },

  /**
   * Upload multiple files with progress tracking
   * @param {FileList|Array} files - Files to upload
   * @param {string} folderPath - Folder path (optional)
   * @param {Object} options - Upload options
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleFiles(files, folderPath = null, options = {}, onProgress = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to upload files')

      const fileArray = Array.from(files)
      const results = []
      const totalFiles = fileArray.length

      for (let index = 0; index < fileArray.length; index++) {
        const file = fileArray[index]
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop()
        
        let path
        if (folderPath) {
          path = `${user.id}/${folderPath}/${timestamp}-${index}-${randomString}.${fileExtension}`
        } else {
          path = `${user.id}/${timestamp}-${index}-${randomString}.${fileExtension}`
        }

        // Individual file progress callback
        const fileProgressCallback = onProgress ? (progress) => {
          const overallProgress = {
            currentFile: index + 1,
            totalFiles,
            currentFileProgress: progress.progress,
            overallProgress: Math.round(((index + progress.progress / 100) / totalFiles) * 100),
            stage: progress.stage,
            fileName: file.name
          }
          onProgress(overallProgress)
        } : null

        try {
          const result = await this.uploadFile(file, path, options, fileProgressCallback)
          results.push({ success: true, result, file: file.name })
        } catch (error) {
          console.error(`Failed to upload file ${file.name}:`, error)
          results.push({ success: false, error: error.message, file: file.name })
        }
      }

      if (onProgress) {
        onProgress({
          currentFile: totalFiles,
          totalFiles,
          currentFileProgress: 100,
          overallProgress: 100,
          stage: 'complete',
          fileName: 'All files'
        })
      }

      return results
    } catch (error) {
      console.error('Upload multiple files error:', error)
      throw error
    }
  },

  /**
   * Delete a file from storage
   * @param {string} path - File path to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(path) {
    try {
      const { error } = await supabase.storage
        .from('vehicle-images')
        .remove([path])

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete file error:', error)
      throw error
    }
  },

  /**
   * Delete multiple files
   * @param {Array} paths - Array of file paths to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteMultipleFiles(paths) {
    try {
      const { error } = await supabase.storage
        .from('vehicle-images')
        .remove(paths)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delete multiple files error:', error)
      throw error
    }
  },

  /**
   * Get public URL for a file
   * @param {string} path - File path
   * @returns {string} Public URL
   */
  getPublicUrl(path) {
    const { data } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(path)

    return data.publicUrl
  },

  /**
   * Get signed URL for a file (for private access)
   * @param {string} path - File path
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(path, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from('vehicle-images')
        .createSignedUrl(path, expiresIn)

      if (error) throw error
      return data.signedUrl
    } catch (error) {
      console.error('Get signed URL error:', error)
      throw error
    }
  },

  /**
   * List files in a folder
   * @param {string} folderPath - Folder path (optional, defaults to user's folder)
   * @param {Object} options - List options
   * @returns {Promise<Array>} Array of files
   */
  async listFiles(folderPath = null, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated to list files')

      const path = folderPath || user.id

      const { data, error } = await supabase.storage
        .from('vehicle-images')
        .list(path, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
          ...options
        })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('List files error:', error)
      throw error
    }
  },

  /**
   * Get file metadata
   * @param {string} path - File path
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(path) {
    try {
      const { data, error } = await supabase.storage
        .from('vehicle-images')
        .list('', {
          search: path
        })

      if (error) throw error
      
      const file = data.find(f => f.name === path.split('/').pop())
      return file || null
    } catch (error) {
      console.error('Get file metadata error:', error)
      throw error
    }
  },

  /**
   * Move/rename a file
   * @param {string} fromPath - Current file path
   * @param {string} toPath - New file path
   * @returns {Promise<boolean>} Success status
   */
  async moveFile(fromPath, toPath) {
    try {
      const { error } = await supabase.storage
        .from('vehicle-images')
        .move(fromPath, toPath)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Move file error:', error)
      throw error
    }
  },

  /**
   * Copy a file
   * @param {string} fromPath - Source file path
   * @param {string} toPath - Destination file path
   * @returns {Promise<boolean>} Success status
   */
  async copyFile(fromPath, toPath) {
    try {
      const { error } = await supabase.storage
        .from('vehicle-images')
        .copy(fromPath, toPath)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Copy file error:', error)
      throw error
    }
  },

  /**
   * Validate file before upload with comprehensive checks
   * @param {File} file - File to validate
   * @param {Object} constraints - Validation constraints
   * @returns {Promise<Object>} Validation result
   */
  async validateFile(file, constraints = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      minSize = 1024, // 1KB minimum
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      maxWidth = null,
      maxHeight = null,
      minWidth = null,
      minHeight = null,
      allowedExtensions = null,
      checkMagicBytes = true
    } = constraints

    const errors = []
    const warnings = []

    // Basic file checks
    if (!file) {
      errors.push('No file provided')
      return { isValid: false, errors, warnings }
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`)
    }

    if (file.size < minSize) {
      errors.push(`File size (${file.size} bytes) is below minimum required size (${minSize} bytes)`)
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Check file extension if specified
    if (allowedExtensions) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`File extension .${fileExtension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`)
      }
    }

    // Check for suspicious file names
    const suspiciousPatterns = [/\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.pif$/i]
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      errors.push('File name contains suspicious patterns')
    }

    // Magic byte validation for images
    if (checkMagicBytes && file.type.startsWith('image/')) {
      try {
        const isValidImage = await this.validateImageMagicBytes(file)
        if (!isValidImage) {
          errors.push('File appears to be corrupted or not a valid image')
        }
      } catch (error) {
        warnings.push('Could not validate file integrity')
      }
    }

    // For images, check dimensions if specified
    if (file.type.startsWith('image/') && (maxWidth || maxHeight || minWidth || minHeight)) {
      try {
        const dimensions = await imageUtils.getImageDimensions(file)
        
        if (maxWidth && dimensions.width > maxWidth) {
          errors.push(`Image width (${dimensions.width}px) exceeds maximum allowed width (${maxWidth}px)`)
        }
        
        if (maxHeight && dimensions.height > maxHeight) {
          errors.push(`Image height (${dimensions.height}px) exceeds maximum allowed height (${maxHeight}px)`)
        }
        
        if (minWidth && dimensions.width < minWidth) {
          errors.push(`Image width (${dimensions.width}px) is below minimum required width (${minWidth}px)`)
        }
        
        if (minHeight && dimensions.height < minHeight) {
          errors.push(`Image height (${dimensions.height}px) is below minimum required height (${minHeight}px)`)
        }

        // Add dimension info to result
        return { 
          isValid: errors.length === 0, 
          errors, 
          warnings,
          dimensions,
          fileSize: file.size,
          fileType: file.type
        }
      } catch (error) {
        errors.push('Could not read image dimensions')
      }
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings,
      fileSize: file.size,
      fileType: file.type
    }
  },

  /**
   * Validate image magic bytes to ensure file integrity
   * @param {File} file - Image file to validate
   * @returns {Promise<boolean>} True if valid image
   */
  async validateImageMagicBytes(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const arr = new Uint8Array(e.target.result).subarray(0, 4)
        const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
        
        // Common image magic bytes
        const magicBytes = {
          'ffd8ffe0': 'jpeg',
          'ffd8ffe1': 'jpeg',
          'ffd8ffe2': 'jpeg',
          'ffd8ffe3': 'jpeg',
          'ffd8ffe8': 'jpeg',
          '89504e47': 'png',
          '47494638': 'gif',
          '52494646': 'webp'
        }
        
        const isValid = Object.keys(magicBytes).some(magic => header.startsWith(magic))
        resolve(isValid)
      }
      reader.onerror = () => resolve(false)
      reader.readAsArrayBuffer(file.slice(0, 4))
    })
  }
}

export default storageService