import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, RotateCw, Eye, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFileUpload } from '@/hooks/useFileUpload'
import {
  createImagePreview,
  revokeImagePreview,
  formatFileSize,
  isImageFile,
  dragDropUtils,
  imageProcessingUtils,
  progressUtils
} from '@/utils/imageUpload'

/**
 * Advanced Image Upload Component with drag-and-drop, preview, and progress tracking
 */
const ImageUpload = ({
  onUploadComplete,
  onUploadError,
  multiple = false,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '',
  disabled = false,
  showPreview = true,
  showProgress = true,
  optimize = true,
  generateThumbnail = true
}) => {
  const fileInputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previews, setPreviews] = useState([])
  const [validationErrors, setValidationErrors] = useState([])

  const {
    uploadFile,
    uploadMultipleFiles,
    validateFiles,
    resetUploadState,
    isUploading,
    progress,
    stage,
    error,
    currentFile,
    results
  } = useFileUpload({
    optimize,
    generateThumbnail,
    validationConstraints: {
      maxSize,
      allowedTypes: acceptedTypes,
      maxWidth: 4000,
      maxHeight: 4000
    }
  })

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (files) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // Limit files if multiple is false
    const selectedFiles = multiple ? fileArray.slice(0, maxFiles) : [fileArray[0]]

    // Validate files
    const validationResults = await validateFiles(selectedFiles)
    const errors = validationResults.filter(result => !result.isValid)
    
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])

    // Create previews
    if (showPreview) {
      const newPreviews = selectedFiles.map(file => ({
        file,
        preview: createImagePreview(file),
        id: Math.random().toString(36).substring(2)
      }))
      setPreviews(newPreviews)
    }

    // Upload files
    try {
      let uploadResults
      if (multiple && selectedFiles.length > 1) {
        uploadResults = await uploadMultipleFiles(selectedFiles)
      } else {
        const result = await uploadFile(selectedFiles[0])
        uploadResults = [{ success: true, result }]
      }

      if (onUploadComplete) {
        onUploadComplete(uploadResults)
      }
    } catch (uploadError) {
      if (onUploadError) {
        onUploadError(uploadError)
      }
    }
  }, [multiple, maxFiles, validateFiles, uploadFile, uploadMultipleFiles, showPreview, onUploadComplete, onUploadError])

  /**
   * Handle drag and drop events
   */
  const handleDragOver = useCallback((e) => {
    dragDropUtils.handleDragOver(e)
  }, [])

  const handleDragEnter = useCallback((e) => {
    dragDropUtils.handleDragEnter(e, setIsDragOver)
  }, [])

  const handleDragLeave = useCallback((e) => {
    dragDropUtils.handleDragLeave(e, setIsDragOver)
  }, [])

  const handleDrop = useCallback((e) => {
    dragDropUtils.handleDrop(e, handleFileSelect, {
      acceptedTypes: acceptedTypes.map(type => type.replace('image/', 'image/*')),
      maxFiles
    })
    setIsDragOver(false)
  }, [handleFileSelect, acceptedTypes, maxFiles])

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback((e) => {
    handleFileSelect(e.target.files)
  }, [handleFileSelect])

  /**
   * Remove preview
   */
  const removePreview = useCallback((previewId) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== previewId)
      // Revoke URL for removed preview
      const removed = prev.find(p => p.id === previewId)
      if (removed) {
        revokeImagePreview(removed.preview)
      }
      return updated
    })
  }, [])

  /**
   * Rotate image
   */
  const rotateImage = useCallback(async (previewId, degrees = 90) => {
    const preview = previews.find(p => p.id === previewId)
    if (!preview) return

    try {
      const rotatedFile = await imageProcessingUtils.rotateImage(preview.file, degrees)
      const newPreview = createImagePreview(rotatedFile)
      
      setPreviews(prev => prev.map(p => 
        p.id === previewId 
          ? { ...p, file: rotatedFile, preview: newPreview }
          : p
      ))
      
      // Revoke old preview URL
      revokeImagePreview(preview.preview)
    } catch (error) {
      console.error('Failed to rotate image:', error)
    }
  }, [previews])

  /**
   * Clear all previews and reset state
   */
  const clearAll = useCallback(() => {
    previews.forEach(preview => revokeImagePreview(preview.preview))
    setPreviews([])
    setValidationErrors([])
    resetUploadState()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [previews, resetUploadState])

  /**
   * Open file dialog
   */
  const openFileDialog = useCallback(() => {
    if (fileInputRef.current && !disabled && !isUploading) {
      fileInputRef.current.click()
    }
  }, [disabled, isUploading])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-amber-50' : 'border-gray-300'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <div className="space-y-2">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? 'שחרר כדי להעלות' : 'גרור תמונות לכאן או לחץ לבחירה'}
            </p>
            <p className="text-sm text-gray-500">
              {multiple ? `עד ${maxFiles} קבצים` : 'קובץ אחד'} • 
              {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • 
              עד {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>
                  <strong>{error.file}:</strong> {error.errors.join(', ')}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {showProgress && isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progressUtils.formatStage(stage)}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          {currentFile && (
            <p className="text-xs text-gray-500">מעלה: {currentFile}</p>
          )}
        </div>
      )}

      {/* Upload Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Success */}
      {results.length > 0 && !isUploading && !error && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            הועלו בהצלחה {results.filter(r => r.success).length} קבצים
          </AlertDescription>
        </Alert>
      )}

      {/* Image Previews */}
      {showPreview && previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">תצוגה מקדימה</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              disabled={isUploading}
            >
              נקה הכל
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview) => (
              <div key={preview.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={preview.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Preview Controls */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      rotateImage(preview.id)
                    }}
                    disabled={isUploading}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(preview.preview, '_blank')
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePreview(preview.id)
                    }}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* File Info */}
                <div className="mt-2 text-xs text-gray-500">
                  <p className="truncate">{preview.file.name}</p>
                  <p>{formatFileSize(preview.file.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload