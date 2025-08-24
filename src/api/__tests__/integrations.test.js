/**
 * Integration tests for API integrations layer
 * Tests the enhanced Supabase integration functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  UploadFile,
  SendEmail,
  InvokeLLM,
  UploadMultipleFiles,
  DeleteFile,
  DeleteMultipleFiles,
  GetFileUrl,
  GetSignedUrl,
  HealthCheck
} from '../integrations'

// Mock Supabase
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
        createSignedUrl: vi.fn()
      })),
      listBuckets: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    }
  }
}))

// Mock storage service
vi.mock('@/services/storage', () => ({
  default: {
    validateFile: vi.fn(),
    uploadFile: vi.fn(),
    uploadMultipleFiles: vi.fn(),
    deleteFile: vi.fn(),
    deleteMultipleFiles: vi.fn(),
    getPublicUrl: vi.fn(),
    getSignedUrl: vi.fn()
  }
}))

describe('API Integrations Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('UploadFile', () => {
    it('should upload file successfully with valid input', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const mockResult = {
        publicUrl: 'https://example.com/test.jpg',
        path: 'user/test.jpg',
        fullPath: 'bucket/user/test.jpg',
        metadata: { size: 1024 }
      }

      const storageService = await import('@/services/storage')
      storageService.default.validateFile.mockResolvedValue({ isValid: true, errors: [] })
      storageService.default.uploadFile.mockResolvedValue(mockResult)

      const result = await UploadFile({ file: mockFile })

      expect(result.success).toBe(true)
      expect(result.file_url).toBe(mockResult.publicUrl)
      expect(result.path).toBe(mockResult.path)
      expect(storageService.default.validateFile).toHaveBeenCalledWith(mockFile, expect.any(Object))
      expect(storageService.default.uploadFile).toHaveBeenCalledWith(mockFile, null, {}, null)
    })

    it('should throw error when file is missing', async () => {
      await expect(UploadFile({})).rejects.toThrow('File is required for upload')
    })

    it('should throw error when file validation fails', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      const storageService = await import('@/services/storage')
      storageService.default.validateFile.mockResolvedValue({
        isValid: false,
        errors: ['Invalid file type']
      })

      await expect(UploadFile({ file: mockFile })).rejects.toThrow('File validation failed: Invalid file type')
    })
  })

  describe('SendEmail', () => {
    it('should send email successfully via edge function', async () => {
      const mockPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      }

      const { supabase } = await import('@/lib/supabase')
      supabase.functions.invoke.mockResolvedValue({
        data: { id: 'email_123', status: 'sent' },
        error: null
      })

      const result = await SendEmail(mockPayload)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('supabase-edge-function')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: expect.objectContaining(mockPayload)
      })
    })

    it('should fallback to stub when edge function fails', async () => {
      const mockPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
      }

      const { supabase } = await import('@/lib/supabase')
      supabase.functions.invoke.mockRejectedValue(new Error('Edge function not available'))

      const result = await SendEmail(mockPayload)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('fallback-stub')
      expect(result.warning).toContain('fallback method')
    })

    it('should validate email addresses', async () => {
      const invalidPayload = {
        to: 'invalid-email',
        subject: 'Test',
        message: 'Test message'
      }

      await expect(SendEmail(invalidPayload)).rejects.toThrow('Invalid recipient email address')
    })

    it('should require all mandatory fields', async () => {
      await expect(SendEmail({ to: 'test@example.com' })).rejects.toThrow('Email requires to, subject, and message fields')
    })
  })

  describe('InvokeLLM', () => {
    it('should invoke LLM successfully via edge function', async () => {
      const mockParams = {
        prompt: 'Test prompt for vehicle pricing',
        add_context_from_internet: true
      }

      const { supabase } = await import('@/lib/supabase')
      supabase.functions.invoke.mockResolvedValue({
        data: {
          response: 'AI response',
          model: 'gpt-4',
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        },
        error: null
      })

      const result = await InvokeLLM(mockParams)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('supabase-edge-function')
      expect(result.response).toBe('AI response')
      expect(supabase.functions.invoke).toHaveBeenCalledWith('invoke-llm', {
        body: expect.objectContaining(mockParams)
      })
    })

    it('should fallback to contextual response when edge function fails', async () => {
      const mockParams = {
        prompt: 'What is the price of this vehicle?',
        context: { vehicle: { year: 2020, manufacturer: 'Toyota', model: 'Camry' } }
      }

      const { supabase } = await import('@/lib/supabase')
      supabase.functions.invoke.mockRejectedValue(new Error('LLM service unavailable'))

      const result = await InvokeLLM(mockParams)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('enhanced-fallback-stub')
      expect(result.response).toContain('Toyota Camry')
      expect(result.response).toContain('2020')
    })

    it('should validate prompt requirements', async () => {
      await expect(InvokeLLM({})).rejects.toThrow('Valid prompt string is required')
      await expect(InvokeLLM({ prompt: 'short' })).rejects.toThrow('Prompt must be at least 10 characters long')
      await expect(InvokeLLM({ prompt: 'a'.repeat(10001) })).rejects.toThrow('Prompt exceeds maximum length')
    })
  })

  describe('UploadMultipleFiles', () => {
    it('should upload multiple files successfully', async () => {
      const mockFiles = [
        new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'file2.jpg', { type: 'image/jpeg' })
      ]

      const mockResults = [
        { success: true, result: { publicUrl: 'url1', path: 'path1' }, file: 'file1.jpg' },
        { success: true, result: { publicUrl: 'url2', path: 'path2' }, file: 'file2.jpg' }
      ]

      const storageService = await import('@/services/storage')
      storageService.default.validateFile.mockResolvedValue({ isValid: true, errors: [] })
      storageService.default.uploadMultipleFiles.mockResolvedValue(mockResults)

      const result = await UploadMultipleFiles({ files: mockFiles })

      expect(result).toHaveLength(2)
      expect(result[0].success).toBe(true)
      expect(result[0].file_url).toBe('url1')
      expect(result[1].success).toBe(true)
      expect(result[1].file_url).toBe('url2')
    })

    it('should throw error when no files provided', async () => {
      await expect(UploadMultipleFiles({ files: [] })).rejects.toThrow('Files are required for upload')
    })
  })

  describe('DeleteFile', () => {
    it('should delete file successfully', async () => {
      const storageService = await import('@/services/storage')
      storageService.default.deleteFile.mockResolvedValue(true)

      const result = await DeleteFile({ path: 'test/file.jpg' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('File deleted successfully')
      expect(result.path).toBe('test/file.jpg')
    })

    it('should validate path parameter', async () => {
      await expect(DeleteFile({})).rejects.toThrow('Valid file path is required')
      await expect(DeleteFile({ path: '' })).rejects.toThrow('File path cannot be empty')
      await expect(DeleteFile({ path: '   ' })).rejects.toThrow('File path cannot be empty')
    })
  })

  describe('GetFileUrl', () => {
    it('should return valid public URL', () => {
      const storageService = require('@/services/storage').default
      storageService.getPublicUrl.mockReturnValue('https://example.com/file.jpg')

      const url = GetFileUrl({ path: 'test/file.jpg' })

      expect(url).toBe('https://example.com/file.jpg')
      expect(storageService.getPublicUrl).toHaveBeenCalledWith('test/file.jpg')
    })

    it('should validate path parameter', () => {
      expect(() => GetFileUrl({})).toThrow('Valid file path is required')
      expect(() => GetFileUrl({ path: '' })).toThrow('File path cannot be empty')
    })
  })

  describe('GetSignedUrl', () => {
    it('should return valid signed URL', async () => {
      const storageService = await import('@/services/storage')
      storageService.default.getSignedUrl.mockResolvedValue('https://example.com/signed-url')

      const url = await GetSignedUrl({ path: 'test/file.jpg', expiresIn: 3600 })

      expect(url).toBe('https://example.com/signed-url')
      expect(storageService.default.getSignedUrl).toHaveBeenCalledWith('test/file.jpg', 3600)
    })

    it('should validate expiration time', async () => {
      await expect(GetSignedUrl({ path: 'test.jpg', expiresIn: 0 })).rejects.toThrow('Expiration time must be between')
      await expect(GetSignedUrl({ path: 'test.jpg', expiresIn: 700000 })).rejects.toThrow('Expiration time must be between')
    })
  })

  describe('HealthCheck', () => {
    it('should return healthy status when all services are available', async () => {
      const { supabase } = await import('@/lib/supabase')
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
      supabase.storage.listBuckets.mockResolvedValue({ data: [] })
      supabase.functions.invoke.mockResolvedValue({ error: null })

      const result = await HealthCheck()

      expect(result.healthy).toBe(true)
      expect(result.checks.auth).toBe(true)
      expect(result.checks.storage).toBe(true)
    })

    it('should handle service failures gracefully', async () => {
      const { supabase } = await import('@/lib/supabase')
      supabase.auth.getUser.mockRejectedValue(new Error('Auth failed'))
      supabase.storage.listBuckets.mockResolvedValue({ data: [] })

      const result = await HealthCheck()

      expect(result.healthy).toBe(false) // Auth failed, so overall health is false
      expect(result.checks.auth).toBe(false)
      expect(result.checks.storage).toBe(true)
    })
  })
})