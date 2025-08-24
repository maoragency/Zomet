/**
 * Image upload utilities for handling file operations, previews, and drag-and-drop
 */

/**
 * Create image preview URL from file
 * @param {File} file - Image file
 * @returns {string} Preview URL
 */
export const createImagePreview = (file) => {
  if (!file || !file.type.startsWith('image/')) {
    return null
  }
  return URL.createObjectURL(file)
}

/**
 * Revoke image preview URL to free memory
 * @param {string} url - Preview URL to revoke
 */
export const revokeImagePreview = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Check if file is an image
 * @param {File} file - File to check
 * @returns {boolean} True if file is an image
 */
export const isImageFile = (file) => {
  return file && file.type.startsWith('image/')
}

/**
 * Convert file to base64 string
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

/**
 * Drag and drop utilities
 */
export const dragDropUtils = {
  /**
   * Handle drag over event
   * @param {Event} e - Drag event
   */
  handleDragOver: (e) => {
    e.preventDefault()
    e.stopPropagation()
  },

  /**
   * Handle drag enter event
   * @param {Event} e - Drag event
   * @param {Function} callback - Callback function
   */
  handleDragEnter: (e, callback) => {
    e.preventDefault()
    e.stopPropagation()
    if (callback) callback(true)
  },

  /**
   * Handle drag leave event
   * @param {Event} e - Drag event
   * @param {Function} callback - Callback function
   */
  handleDragLeave: (e, callback) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only trigger callback if leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (callback) callback(false)
    }
  },

  /**
   * Handle drop event
   * @param {Event} e - Drop event
   * @param {Function} callback - Callback function with files
   * @param {Object} options - Drop options
   */
  handleDrop: (e, callback, options = {}) => {
    e.preventDefault()
    e.stopPropagation()
    
    const { acceptedTypes = ['image/*'], maxFiles = 10 } = options
    
    const files = Array.from(e.dataTransfer.files)
    
    // Filter files by accepted types
    const filteredFiles = files.filter(file => {
      return acceptedTypes.some(type => {
        if (type === 'image/*') return file.type.startsWith('image/')
        return file.type === type
      })
    })
    
    // Limit number of files
    const limitedFiles = filteredFiles.slice(0, maxFiles)
    
    if (callback) callback(limitedFiles)
  },

  /**
   * Check if drag event contains files
   * @param {Event} e - Drag event
   * @returns {boolean} True if contains files
   */
  hasFiles: (e) => {
    return e.dataTransfer && e.dataTransfer.types.includes('Files')
  }
}

/**
 * Image processing utilities
 */
export const imageProcessingUtils = {
  /**
   * Rotate image by degrees
   * @param {File} file - Image file
   * @param {number} degrees - Rotation degrees (90, 180, 270)
   * @returns {Promise<File>} Rotated image file
   */
  rotateImage: (file, degrees) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const { width, height } = img
        
        // Set canvas dimensions based on rotation
        if (degrees === 90 || degrees === 270) {
          canvas.width = height
          canvas.height = width
        } else {
          canvas.width = width
          canvas.height = height
        }

        // Apply rotation
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((degrees * Math.PI) / 180)
        ctx.drawImage(img, -width / 2, -height / 2)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const rotatedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(rotatedFile)
            } else {
              reject(new Error('Failed to rotate image'))
            }
          },
          file.type,
          0.9
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Crop image to specified dimensions
   * @param {File} file - Image file
   * @param {Object} cropArea - Crop area {x, y, width, height}
   * @returns {Promise<File>} Cropped image file
   */
  cropImage: (file, cropArea) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = cropArea.width
        canvas.height = cropArea.height

        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        )

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(croppedFile)
            } else {
              reject(new Error('Failed to crop image'))
            }
          },
          file.type,
          0.9
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }
}

/**
 * File organization utilities
 */
export const fileOrganizationUtils = {
  /**
   * Generate organized file path
   * @param {string} userId - User ID
   * @param {string} category - File category (e.g., 'vehicles', 'profiles')
   * @param {string} filename - Original filename
   * @param {Object} options - Path options
   * @returns {string} Organized file path
   */
  generateFilePath: (userId, category, filename, options = {}) => {
    const {
      includeDate = true,
      includeRandom = true,
      preserveOriginalName = false
    } = options

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = getFileExtension(filename)
    
    let baseName
    if (preserveOriginalName) {
      baseName = filename.replace(/\.[^/.]+$/, '') // Remove extension
      baseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize
    } else {
      baseName = includeRandom ? randomString : 'file'
    }

    let pathParts = [userId, category]
    
    if (includeDate) {
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      pathParts.push(`${year}/${month}`)
    }

    const fileName = includeDate 
      ? `${timestamp}-${baseName}.${fileExtension}`
      : `${baseName}.${fileExtension}`

    pathParts.push(fileName)
    
    return pathParts.join('/')
  },

  /**
   * Extract metadata from file path
   * @param {string} path - File path
   * @returns {Object} Path metadata
   */
  parseFilePath: (path) => {
    const parts = path.split('/')
    const filename = parts[parts.length - 1]
    const [timestamp, ...nameParts] = filename.split('-')
    
    return {
      userId: parts[0],
      category: parts[1],
      year: parts[2],
      month: parts[3],
      timestamp: parseInt(timestamp),
      filename,
      originalName: nameParts.join('-').replace(/\.[^/.]+$/, ''),
      extension: getFileExtension(filename)
    }
  }
}

/**
 * Upload progress utilities
 */
export const progressUtils = {
  /**
   * Format progress stage for display
   * @param {string} stage - Progress stage
   * @returns {string} Formatted stage text
   */
  formatStage: (stage) => {
    const stageMap = {
      'idle': 'מוכן להעלאה',
      'starting': 'מתחיל העלאה',
      'optimizing': 'מייעל תמונה',
      'thumbnail': 'יוצר תמונה ממוזערת',
      'uploading': 'מעלה קובץ',
      'complete': 'הועלה בהצלחה',
      'error': 'שגיאה בהעלאה',
      'cancelled': 'העלאה בוטלה'
    }
    
    return stageMap[stage] || stage
  },

  /**
   * Get progress color based on stage
   * @param {string} stage - Progress stage
   * @returns {string} CSS color class
   */
  getProgressColor: (stage) => {
    const colorMap = {
      'idle': 'bg-gray-200',
      'starting': 'bg-blue-200',
      'optimizing': 'bg-yellow-200',
      'thumbnail': 'bg-orange-200',
      'uploading': 'bg-gradient-to-r from-blue-50 to-amber-500',
      'complete': 'bg-green-500',
      'error': 'bg-red-500',
      'cancelled': 'bg-gray-500'
    }
    
    return colorMap[stage] || 'bg-gray-200'
  }
}

export default {
  createImagePreview,
  revokeImagePreview,
  formatFileSize,
  getFileExtension,
  isImageFile,
  fileToBase64,
  dragDropUtils,
  imageProcessingUtils,
  fileOrganizationUtils,
  progressUtils
}