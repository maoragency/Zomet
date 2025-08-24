/**
 * Tests for storage service functionality
 * Note: These tests require a properly configured Supabase instance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { storageService } from '../storage'
import { supabase } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
        createSignedUrl: vi.fn(),
        list: vi.fn(),
        move: vi.fn(),
        copy: vi.fn()
      }))
    }
  }
}))

// Mock file for testing
const createMockFile = (name = 'test.jpg', size = 1024, type = 'image/jpeg') => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock image for dimension testing
const createMockImage = () => {
  const mockImage = {
    width: 800,
    height: 600,
    onload: null,
    onerror: null,
    src: ''
  }
  
  // Mock Image constructor
  global.Image = vi.fn(() => mockImage)
  
  return mockImage
}

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful authentication
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('File Upload', () => {
    it('should upload a file successfully', async () => {
      const mockFile = createMockFile()
      const mockUploadResponse = {
        data: { path: 'test-path', fullPath: 'full-test-path' },
        error: null
      }
      const mockPublicUrlResponse = {
        data: { publicUrl: 'https://example.com/test.jpg' }
      }

      supabase.storage.from().upload.mockResolvedValue(mockUploadResponse)
      supabase.storage.from().getPublicUrl.mockReturnValue(mockPublicUrlResponse)

      const result = await storageService.uploadFile(mockFile)

      expect(result).toEqual({
        path: 'test-path',
        fullPath: 'full-test-path',
        publicUrl: 'https://example.com/test.jpg',
        file_url: 'https://example.com/test.jpg',
        thumbnail: null,
        metadata: expect.objectContaining({
          originalSize: 1024,
          mimeType: 'image/jpeg'
        })
      })
    })

    it('should handle upload errors', async () => {
      const mockFile = createMockFile()
      const mockError = new Error('Upload failed')

      supabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: mockError
      })

      await expect(storageService.uploadFile(mockFile)).rejects.toThrow('Upload failed')
    })

    it('should require authentication', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const mockFile = createMockFile()

      await expect(storageService.uploadFile(mockFile)).rejects.toThrow(
        'User must be authenticated to upload files'
      )
    })
  })

  describe('File Validation', () => {
    it('should validate file size', async () => {
      const mockFile = createMockFile('large.jpg', 20 * 1024 * 1024) // 20MB
      
      const result = await storageService.validateFile(mockFile, {
        maxSize: 10 * 1024 * 1024 // 10MB limit
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('File size')
      )
    })

    it('should validate file type', async () => {
      const mockFile = createMockFile('test.txt', 1024, 'text/plain')
      
      const result = await storageService.validateFile(mockFile, {
        allowedTypes: ['image/jpeg', 'image/png']
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('File type text/plain is not allowed')
      )
    })

    it('should validate image dimensions', async () => {
      const mockFile = createMockFile('large-image.jpg', 1024, 'image/jpeg')
      const mockImage = createMockImage()
      mockImage.width = 5000
      mockImage.height = 4000

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload()
      }, 0)

      const result = await storageService.validateFile(mockFile, {
        maxWidth: 2000,
        maxHeight: 2000
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        expect.stringContaining('Image width')
      )
    })

    it('should pass validation for valid files', async () => {
      const mockFile = createMockFile()
      
      const result = await storageService.validateFile(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Multiple File Upload', () => {
    it('should upload multiple files', async () => {
      const mockFiles = [
        createMockFile('file1.jpg'),
        createMockFile('file2.jpg')
      ]

      const mockUploadResponse = {
        data: { path: 'test-path', fullPath: 'full-test-path' },
        error: null
      }
      const mockPublicUrlResponse = {
        data: { publicUrl: 'https://example.com/test.jpg' }
      }

      supabase.storage.from().upload.mockResolvedValue(mockUploadResponse)
      supabase.storage.from().getPublicUrl.mockReturnValue(mockPublicUrlResponse)

      const results = await storageService.uploadMultipleFiles(mockFiles)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should handle partial failures in multiple uploads', async () => {
      const mockFiles = [
        createMockFile('file1.jpg'),
        createMockFile('file2.jpg')
      ]

      supabase.storage.from().upload
        .mockResolvedValueOnce({
          data: { path: 'test-path', fullPath: 'full-test-path' },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Upload failed')
        })

      supabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' }
      })

      const results = await storageService.uploadMultipleFiles(mockFiles)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('Upload failed')
    })
  })

  describe('File Management', () => {
    it('should delete a file', async () => {
      supabase.storage.from().remove.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await storageService.deleteFile('test-path')

      expect(result).toBe(true)
      expect(supabase.storage.from().remove).toHaveBeenCalledWith(['test-path'])
    })

    it('should delete multiple files', async () => {
      const paths = ['path1', 'path2', 'path3']
      
      supabase.storage.from().remove.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await storageService.deleteMultipleFiles(paths)

      expect(result).toBe(true)
      expect(supabase.storage.from().remove).toHaveBeenCalledWith(paths)
    })

    it('should get public URL', () => {
      const mockUrl = 'https://example.com/test.jpg'
      supabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: mockUrl }
      })

      const result = storageService.getPublicUrl('test-path')

      expect(result).toBe(mockUrl)
    })

    it('should get signed URL', async () => {
      const mockSignedUrl = 'https://example.com/signed-url'
      supabase.storage.from().createSignedUrl.mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      })

      const result = await storageService.getSignedUrl('test-path', 3600)

      expect(result).toBe(mockSignedUrl)
      expect(supabase.storage.from().createSignedUrl).toHaveBeenCalledWith('test-path', 3600)
    })

    it('should list files', async () => {
      const mockFiles = [
        { name: 'file1.jpg', created_at: '2023-01-01' },
        { name: 'file2.jpg', created_at: '2023-01-02' }
      ]

      supabase.storage.from().list.mockResolvedValue({
        data: mockFiles,
        error: null
      })

      const result = await storageService.listFiles('user-folder')

      expect(result).toEqual(mockFiles)
    })

    it('should move a file', async () => {
      supabase.storage.from().move.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await storageService.moveFile('old-path', 'new-path')

      expect(result).toBe(true)
      expect(supabase.storage.from().move).toHaveBeenCalledWith('old-path', 'new-path')
    })

    it('should copy a file', async () => {
      supabase.storage.from().copy.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await storageService.copyFile('source-path', 'dest-path')

      expect(result).toBe(true)
      expect(supabase.storage.from().copy).toHaveBeenCalledWith('source-path', 'dest-path')
    })
  })

  describe('Image Magic Bytes Validation', () => {
    it('should validate JPEG magic bytes', async () => {
      const mockFile = createMockFile('test.jpg', 1024, 'image/jpeg')
      
      // Mock FileReader
      const mockFileReader = {
        readAsArrayBuffer: vi.fn(),
        onload: null,
        onerror: null,
        result: new ArrayBuffer(4)
      }
      
      // Set up JPEG magic bytes (FFD8FFE0)
      const view = new Uint8Array(mockFileReader.result)
      view[0] = 0xFF
      view[1] = 0xD8
      view[2] = 0xFF
      view[3] = 0xE0
      
      global.FileReader = vi.fn(() => mockFileReader)

      const validationPromise = storageService.validateImageMagicBytes(mockFile)
      
      // Simulate FileReader load
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: mockFileReader.result } })
        }
      }, 0)

      const result = await validationPromise

      expect(result).toBe(true)
    })

    it('should reject invalid magic bytes', async () => {
      const mockFile = createMockFile('fake.jpg', 1024, 'image/jpeg')
      
      const mockFileReader = {
        readAsArrayBuffer: vi.fn(),
        onload: null,
        onerror: null,
        result: new ArrayBuffer(4)
      }
      
      // Set up invalid magic bytes
      const view = new Uint8Array(mockFileReader.result)
      view[0] = 0x00
      view[1] = 0x00
      view[2] = 0x00
      view[3] = 0x00
      
      global.FileReader = vi.fn(() => mockFileReader)

      const validationPromise = storageService.validateImageMagicBytes(mockFile)
      
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: mockFileReader.result } })
        }
      }, 0)

      const result = await validationPromise

      expect(result).toBe(false)
    })
  })
})