import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Upload } from 'lucide-react'
import ImageUpload from '@/components/ui/ImageUpload'
import { useFileUpload } from '@/hooks/useFileUpload'
import { storageService } from '@/services/storage'

/**
 * Example component demonstrating file upload functionality
 * This shows different ways to use the file storage system
 */
const FileUploadExample = () => {
  const [uploadResults, setUploadResults] = useState([])
  const [manualUploadFile, setManualUploadFile] = useState(null)

  // Using the upload hook for manual control
  const {
    uploadFile,
    isUploading: isManualUploading,
    progress: manualProgress,
    stage: manualStage,
    error: manualError
  } = useFileUpload({
    optimize: true,
    generateThumbnail: true,
    validationConstraints: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    }
  })

  /**
   * Handle upload completion from ImageUpload component
   */
  const handleUploadComplete = (results) => {
    setUploadResults(results)
  }

  /**
   * Handle upload errors from ImageUpload component
   */
  const handleUploadError = (error) => {
    console.error('Upload error:', error)
  }

  /**
   * Manual file upload using the hook
   */
  const handleManualUpload = async () => {
    if (!manualUploadFile) return

    try {
      const result = await uploadFile(manualUploadFile)
      setUploadResults([{ success: true, result }])
    } catch (error) {
      console.error('Manual upload failed:', error)
    }
  }

  /**
   * Direct service usage example
   */
  const handleDirectServiceUpload = async (file) => {
    try {
      const result = await storageService.uploadFile(
        file,
        null, // Auto-generate path
        {
          optimize: true,
          generateThumbnail: true,
          bucket: 'vehicle-images'
        },
        (progress) => {
        }
      )

      setUploadResults([{ success: true, result }])
    } catch (error) {
      console.error('Direct service upload failed:', error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">File Upload System Examples</h1>
        <p className="text-gray-600 mt-2">
          Demonstrating different ways to use the file storage system
        </p>
      </div>

      {/* Complete Upload Component Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Complete Upload Component
          </CardTitle>
          <CardDescription>
            Full-featured upload component with drag-and-drop, preview, and progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            multiple={true}
            maxFiles={5}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            maxSize={10 * 1024 * 1024} // 10MB
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            optimize={true}
            generateThumbnail={true}
            showPreview={true}
            showProgress={true}
          />
        </CardContent>
      </Card>

      {/* Manual Upload with Hook Example */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Upload with Hook</CardTitle>
          <CardDescription>
            Using the useFileUpload hook for custom upload logic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setManualUploadFile(e.target.files[0])}
              disabled={isManualUploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r from-blue-50 to-amber-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {manualUploadFile && (
            <div className="text-sm text-gray-600">
              Selected: {manualUploadFile.name} ({(manualUploadFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          <Button
            onClick={handleManualUpload}
            disabled={!manualUploadFile || isManualUploading}
          >
            {isManualUploading ? 'Uploading...' : 'Upload File'}
          </Button>

          {isManualUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Stage: {manualStage}</span>
                <span>{manualProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${manualProgress}%` }}
                />
              </div>
            </div>
          )}

          {manualError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{manualError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Direct Service Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Service Usage</CardTitle>
          <CardDescription>
            Using the storage service directly for maximum control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) {
                handleDirectServiceUpload(file)
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  {result.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Upload Successful</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>File URL:</strong>
                          <br />
                          <a
                            href={result.result.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
                          >
                            {result.result.publicUrl}
                          </a>
                        </div>
                        
                        {result.result.thumbnail && (
                          <div>
                            <strong>Thumbnail URL:</strong>
                            <br />
                            <a
                              href={result.result.thumbnail.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {result.result.thumbnail.publicUrl}
                            </a>
                          </div>
                        )}
                      </div>

                      {result.result.metadata && (
                        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                          <strong>Metadata:</strong>
                          <ul className="mt-2 space-y-1">
                            <li>Original Size: {(result.result.metadata.originalSize / 1024 / 1024).toFixed(2)} MB</li>
                            <li>Optimized Size: {(result.result.metadata.optimizedSize / 1024 / 1024).toFixed(2)} MB</li>
                            <li>Compression: {(result.result.metadata.compressionRatio * 100).toFixed(1)}%</li>
                            {result.result.metadata.originalDimensions && (
                              <li>
                                Dimensions: {result.result.metadata.originalDimensions.width} × {result.result.metadata.originalDimensions.height}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Image Preview */}
                      <div className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <strong className="block mb-2">Original Image:</strong>
                            <img
                              src={result.result.publicUrl}
                              alt="Uploaded image"
                              className="max-w-full h-48 object-cover rounded border"
                            />
                          </div>
                          
                          {result.result.thumbnail && (
                            <div>
                              <strong className="block mb-2">Thumbnail:</strong>
                              <img
                                src={result.result.thumbnail.publicUrl}
                                alt="Thumbnail"
                                className="max-w-full h-48 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Upload Failed: {result.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>
            Copy these examples to use in your own components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Basic Upload with Hook:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import { useFileUpload } from '@/hooks/useFileUpload'

const { uploadFile, isUploading, progress } = useFileUpload({
  optimize: true,
  generateThumbnail: true
})

const handleUpload = async (file) => {
  try {
    const result = await uploadFile(file)
  } catch (error) {
    console.error('Error:', error)
  }
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Direct Service Usage:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import { storageService } from '@/services/storage'

const result = await storageService.uploadFile(file, null, {
  optimize: true,
  generateThumbnail: true
}, (progress) => {
})`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Complete Upload Component:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`import ImageUpload from '@/components/ui/ImageUpload'

<ImageUpload
  multiple={true}
  maxFiles={5}
  acceptedTypes={['image/jpeg', 'image/png']}
  maxSize={10 * 1024 * 1024}
  onUploadComplete={(results) => }
  optimize={true}
  generateThumbnail={true}
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FileUploadExample