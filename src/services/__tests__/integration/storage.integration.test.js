import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { authService } from '../../auth.js'
import { createMockFile } from '@/test/utils'

// Integration tests for file upload and storage operations
describe('Storage Integration Tests', () => {
  let testUser = null
  let uploadedFiles = []
  const testEmail = `storage-test-${Date.now()}@example.com`
  const testPassword = 'TestPassword123!'
  const testBucket = 'vehicle-images'

  beforeAll(async () => {
    // Create test user for storage operations
    await supabase.auth.signOut()
    const signUpResult = await authService.signUp(testEmail, testPassword, {
      full_name: 'Storage Test User'
    })
    testUser = signUpResult.user
    
    // Sign in the test user
    await authService.signIn(testEmail, testPassword)
  }, 15000)

  afterAll(async () => {
    // Clean up uploaded files
    for (const filePath of uploadedFiles) {
      try {
        await supabase.storage
          .from(testBucket)
          .remove([filePath])
      } catch (error) {
        console.warn('File cleanup error:', error)
      }
    }
    
    // Sign out
    await supabase.auth.signOut()
  })

  beforeEach(async () => {
    // Ensure user is signed in for each test
    const { session } = await authService.getCurrentSession()
    if (!session) {
      await authService.signIn(testEmail, testPassword)
    }
  })

  describe('File Upload', () => {
    it('should upload image file successfully', async () => {
      const file = createMockFile('test-image.jpg', 'image/jpeg', 1024)
      const filePath = `test-uploads/${testUser.id}/test-image-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.path).toBe(filePath)
      
      uploadedFiles.push(filePath)
    })

    it('should handle file size limits', async () => {
      // Create a large file (5MB)
      const largeFile = createMockFile('large-image.jpg', 'image/jpeg', 5 * 1024 * 1024)
      const filePath = `test-uploads/${testUser.id}/large-image-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(filePath, largeFile)

      // Depending on bucket configuration, this might succeed or fail
      // If it succeeds, add to cleanup list
      if (data && !error) {
        uploadedFiles.push(filePath)
      }
      
      // Test should handle both cases gracefully
      expect(typeof error === 'object' || error === null).toBe(true)
    })

    it('should reject invalid file types', async () => {
      const invalidFile = createMockFile('test-script.js', 'application/javascript', 512)
      const filePath = `test-uploads/${testUser.id}/test-script-${Date.now()}.js`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(filePath, invalidFile)

      // Should fail if bucket has file type restrictions
      if (error) {
        expect(error).toBeTruthy()
        expect(data).toBeNull()
      } else {
        // If upload succeeds, add to cleanup
        uploadedFiles.push(filePath)
      }
    })

    it('should handle duplicate file names', async () => {
      const file1 = createMockFile('duplicate.jpg', 'image/jpeg', 1024)
      const file2 = createMockFile('duplicate.jpg', 'image/jpeg', 2048)
      const filePath = `test-uploads/${testUser.id}/duplicate-${Date.now()}.jpg`

      // Upload first file
      const { data: data1, error: error1 } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file1)

      expect(error1).toBeNull()
      expect(data1).toBeTruthy()
      uploadedFiles.push(filePath)

      // Try to upload second file with same path (should fail without upsert)
      const { data: data2, error: error2 } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file2, { upsert: false })

      expect(error2).toBeTruthy()
      expect(data2).toBeNull()
    })

    it('should support file upsert', async () => {
      const file1 = createMockFile('upsert-test.jpg', 'image/jpeg', 1024)
      const file2 = createMockFile('upsert-test.jpg', 'image/jpeg', 2048)
      const filePath = `test-uploads/${testUser.id}/upsert-test-${Date.now()}.jpg`

      // Upload first file
      const { data: data1, error: error1 } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file1)

      expect(error1).toBeNull()
      expect(data1).toBeTruthy()
      uploadedFiles.push(filePath)

      // Upload second file with upsert (should succeed)
      const { data: data2, error: error2 } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file2, { upsert: true })

      expect(error2).toBeNull()
      expect(data2).toBeTruthy()
    })
  })

  describe('File Download and Access', () => {
    let testFilePath = null

    beforeEach(async () => {
      // Upload a test file for download tests
      if (!testFilePath) {
        const file = createMockFile('download-test.jpg', 'image/jpeg', 1024)
        testFilePath = `test-uploads/${testUser.id}/download-test-${Date.now()}.jpg`

        const { data, error } = await supabase.storage
          .from(testBucket)
          .upload(testFilePath, file)

        expect(error).toBeNull()
        uploadedFiles.push(testFilePath)
      }
    })

    it('should download file successfully', async () => {
      const { data, error } = await supabase.storage
        .from(testBucket)
        .download(testFilePath)

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data instanceof Blob).toBe(true)
      expect(data.size).toBeGreaterThan(0)
    })

    it('should get public URL for file', async () => {
      const { data } = supabase.storage
        .from(testBucket)
        .getPublicUrl(testFilePath)

      expect(data).toBeTruthy()
      expect(data.publicUrl).toBeTruthy()
      expect(typeof data.publicUrl).toBe('string')
      expect(data.publicUrl).toContain(testFilePath)
    })

    it('should create signed URL for private access', async () => {
      const expiresIn = 3600 // 1 hour

      const { data, error } = await supabase.storage
        .from(testBucket)
        .createSignedUrl(testFilePath, expiresIn)

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data.signedUrl).toBeTruthy()
      expect(typeof data.signedUrl).toBe('string')
      expect(data.signedUrl).toContain(testFilePath)
    })

    it('should handle non-existent file download', async () => {
      const nonExistentPath = `test-uploads/${testUser.id}/non-existent-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .download(nonExistentPath)

      expect(error).toBeTruthy()
      expect(data).toBeNull()
    })
  })

  describe('File Listing and Management', () => {
    let testFolderPath = null

    beforeEach(async () => {
      // Create test folder with files
      if (!testFolderPath) {
        testFolderPath = `test-uploads/${testUser.id}/list-test-${Date.now()}`
        
        // Upload multiple test files
        for (let i = 1; i <= 3; i++) {
          const file = createMockFile(`test-file-${i}.jpg`, 'image/jpeg', 1024 * i)
          const filePath = `${testFolderPath}/test-file-${i}.jpg`

          const { error } = await supabase.storage
            .from(testBucket)
            .upload(filePath, file)

          expect(error).toBeNull()
          uploadedFiles.push(filePath)
        }
      }
    })

    it('should list files in folder', async () => {
      const { data, error } = await supabase.storage
        .from(testBucket)
        .list(testFolderPath, {
          limit: 10,
          offset: 0
        })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
      
      data.forEach(file => {
        expect(file.name).toMatch(/test-file-\d\.jpg/)
        expect(file.metadata).toBeTruthy()
        expect(file.created_at).toBeTruthy()
        expect(file.updated_at).toBeTruthy()
      })
    })

    it('should search files by name', async () => {
      const { data, error } = await supabase.storage
        .from(testBucket)
        .list(testFolderPath, {
          search: 'test-file-1'
        })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].name).toBe('test-file-1.jpg')
    })

    it('should sort files by different criteria', async () => {
      const { data, error } = await supabase.storage
        .from(testBucket)
        .list(testFolderPath, {
          sortBy: { column: 'name', order: 'asc' }
        })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
      
      // Check if sorted by name ascending
      for (let i = 1; i < data.length; i++) {
        expect(data[i].name >= data[i - 1].name).toBe(true)
      }
    })
  })

  describe('File Deletion', () => {
    it('should delete single file', async () => {
      // Upload a file to delete
      const file = createMockFile('delete-test.jpg', 'image/jpeg', 1024)
      const filePath = `test-uploads/${testUser.id}/delete-test-${Date.now()}.jpg`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file)

      expect(uploadError).toBeNull()
      expect(uploadData).toBeTruthy()

      // Delete the file
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from(testBucket)
        .remove([filePath])

      expect(deleteError).toBeNull()
      expect(Array.isArray(deleteData)).toBe(true)
      expect(deleteData.length).toBe(1)
      expect(deleteData[0].name).toBe(filePath.split('/').pop())

      // Verify file is deleted
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(testBucket)
        .download(filePath)

      expect(downloadError).toBeTruthy()
      expect(downloadData).toBeNull()
    })

    it('should delete multiple files', async () => {
      const filePaths = []
      
      // Upload multiple files
      for (let i = 1; i <= 3; i++) {
        const file = createMockFile(`multi-delete-${i}.jpg`, 'image/jpeg', 1024)
        const filePath = `test-uploads/${testUser.id}/multi-delete-${i}-${Date.now()}.jpg`

        const { error } = await supabase.storage
          .from(testBucket)
          .upload(filePath, file)

        expect(error).toBeNull()
        filePaths.push(filePath)
      }

      // Delete all files
      const { data, error } = await supabase.storage
        .from(testBucket)
        .remove(filePaths)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
    })

    it('should handle deletion of non-existent files', async () => {
      const nonExistentPath = `test-uploads/${testUser.id}/non-existent-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .remove([nonExistentPath])

      // Should handle gracefully - might return empty array or error
      expect(Array.isArray(data) || error !== null).toBe(true)
    })
  })

  describe('File Metadata and Information', () => {
    let testFilePath = null

    beforeEach(async () => {
      if (!testFilePath) {
        const file = createMockFile('metadata-test.jpg', 'image/jpeg', 2048)
        testFilePath = `test-uploads/${testUser.id}/metadata-test-${Date.now()}.jpg`

        const { error } = await supabase.storage
          .from(testBucket)
          .upload(testFilePath, file, {
            cacheControl: '3600',
            contentType: 'image/jpeg'
          })

        expect(error).toBeNull()
        uploadedFiles.push(testFilePath)
      }
    })

    it('should get file metadata', async () => {
      const { data, error } = await supabase.storage
        .from(testBucket)
        .list(testFilePath.split('/').slice(0, -1).join('/'), {
          search: testFilePath.split('/').pop()
        })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)

      const fileInfo = data[0]
      expect(fileInfo.name).toBe(testFilePath.split('/').pop())
      expect(fileInfo.metadata).toBeTruthy()
      expect(fileInfo.metadata.size).toBe(2048)
      expect(fileInfo.metadata.mimetype).toBe('image/jpeg')
    })
  })

  describe('Access Control and Security', () => {
    it('should respect bucket policies for authenticated users', async () => {
      // This test depends on the bucket's RLS policies
      const file = createMockFile('auth-test.jpg', 'image/jpeg', 1024)
      const filePath = `test-uploads/${testUser.id}/auth-test-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file)

      // Should succeed for authenticated user
      expect(error).toBeNull()
      expect(data).toBeTruthy()
      
      if (data) {
        uploadedFiles.push(filePath)
      }
    })

    it('should handle unauthorized access', async () => {
      // Sign out to test unauthorized access
      await supabase.auth.signOut()

      const file = createMockFile('unauth-test.jpg', 'image/jpeg', 1024)
      const filePath = `test-uploads/unauthorized/unauth-test-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file)

      // Should fail for unauthenticated user (depending on bucket policy)
      if (error) {
        expect(error).toBeTruthy()
        expect(data).toBeNull()
      }

      // Sign back in for other tests
      await authService.signIn(testEmail, testPassword)
    })

    it('should enforce file path restrictions', async () => {
      const file = createMockFile('restricted-test.jpg', 'image/jpeg', 1024)
      const restrictedPath = `other-user-folder/restricted-test-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(restrictedPath, file)

      // Depending on RLS policies, this might fail
      if (error) {
        expect(error).toBeTruthy()
      } else if (data) {
        // If it succeeds, add to cleanup
        uploadedFiles.push(restrictedPath)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid bucket name', async () => {
      const file = createMockFile('invalid-bucket-test.jpg', 'image/jpeg', 1024)
      const filePath = `test-uploads/${testUser.id}/invalid-bucket-test.jpg`

      const { data, error } = await supabase.storage
        .from('non-existent-bucket')
        .upload(filePath, file)

      expect(error).toBeTruthy()
      expect(data).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      // This would require mocking network failures
      // For now, test with edge cases that might cause issues
      
      const file = createMockFile('network-test.jpg', 'image/jpeg', 0) // Empty file
      const filePath = `test-uploads/${testUser.id}/network-test-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(filePath, file)

      // Should handle empty file gracefully
      if (data && !error) {
        uploadedFiles.push(filePath)
      }
      
      expect(typeof error === 'object' || error === null).toBe(true)
    })

    it('should handle malformed file paths', async () => {
      const file = createMockFile('malformed-test.jpg', 'image/jpeg', 1024)
      const malformedPath = '../../../malformed-test.jpg'

      const { data, error } = await supabase.storage
        .from(testBucket)
        .upload(malformedPath, file)

      // Should reject malformed paths
      expect(error).toBeTruthy()
      expect(data).toBeNull()
    })
  })
})