import { useState, useCallback } from 'react'
import { storageService } from '@/services/storage'

/**
 * Custom hook for file uploads with progress tracking and state management
 * @param {Object} options - Upload configuration options
 * @returns {Object} Upload state and functions
 */
export const useFileUpload = (options = {}) => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    stage: 'idle',
    error: null,
    results: [],
    currentFile: null
  })

  const {
    optimize = true,
    generateThumbnail = true,
    bucket = 'vehicle-images',
    compressionOptions = {},
    thumbnailOptions = {},
    validationConstraints = {}
  } = options

  /**
   * Upload a single file
   * @param {File} file - File to upload
   * @param {string} path - Optional custom path
   * @returns {Promise<Object>} Upload result
   */
  const uploadFile = useCallback(async (file, path = null) => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      stage: 'starting',
      error: null,
      currentFile: file.name
    }))

    try {
      const result = await storageService.uploadFile(
        file,
        path,
        {
          optimize,
          generateThumbnail,
          bucket,
          compressionOptions,
          thumbnailOptions,
          ...validationConstraints
        },
        (progressInfo) => {
          setUploadState(prev => ({
            ...prev,
            progress: progressInfo.progress,
            stage: progressInfo.stage
          }))
        }
      )

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        stage: 'complete',
        results: [result]
      }))

      return result
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        stage: 'error',
        error: error.message
      }))
      throw error
    }
  }, [optimize, generateThumbnail, bucket, compressionOptions, thumbnailOptions, validationConstraints])

  /**
   * Upload multiple files
   * @param {FileList|Array} files - Files to upload
   * @param {string} folderPath - Optional folder path
   * @returns {Promise<Array>} Upload results
   */
  const uploadMultipleFiles = useCallback(async (files, folderPath = null) => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      stage: 'starting',
      error: null,
      results: [],
      currentFile: null
    }))

    try {
      const results = await storageService.uploadMultipleFiles(
        files,
        folderPath,
        {
          optimize,
          generateThumbnail,
          bucket,
          compressionOptions,
          thumbnailOptions,
          ...validationConstraints
        },
        (progressInfo) => {
          setUploadState(prev => ({
            ...prev,
            progress: progressInfo.overallProgress,
            stage: progressInfo.stage,
            currentFile: progressInfo.fileName
          }))
        }
      )

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        stage: 'complete',
        results
      }))

      return results
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        stage: 'error',
        error: error.message
      }))
      throw error
    }
  }, [optimize, generateThumbnail, bucket, compressionOptions, thumbnailOptions, validationConstraints])

  /**
   * Validate files before upload
   * @param {FileList|Array} files - Files to validate
   * @returns {Promise<Array>} Validation results
   */
  const validateFiles = useCallback(async (files) => {
    const fileArray = Array.from(files)
    const validationPromises = fileArray.map(async (file) => {
      try {
        const result = await storageService.validateFile(file, validationConstraints)
        return { file: file.name, ...result }
      } catch (error) {
        return {
          file: file.name,
          isValid: false,
          errors: [error.message],
          warnings: []
        }
      }
    })

    return Promise.all(validationPromises)
  }, [validationConstraints])

  /**
   * Reset upload state
   */
  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      stage: 'idle',
      error: null,
      results: [],
      currentFile: null
    })
  }, [])

  /**
   * Cancel upload (note: actual cancellation depends on Supabase client support)
   */
  const cancelUpload = useCallback(() => {
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      stage: 'cancelled',
      error: 'Upload cancelled by user'
    }))
  }, [])

  return {
    // State
    ...uploadState,
    
    // Actions
    uploadFile,
    uploadMultipleFiles,
    validateFiles,
    resetUploadState,
    cancelUpload,
    
    // Computed values
    isIdle: uploadState.stage === 'idle',
    isComplete: uploadState.stage === 'complete',
    hasError: uploadState.stage === 'error',
    successfulUploads: uploadState.results.filter(r => r.success),
    failedUploads: uploadState.results.filter(r => !r.success)
  }
}

export default useFileUpload