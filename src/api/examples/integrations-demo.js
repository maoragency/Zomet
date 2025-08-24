/**
 * Integration Layer Demo and Examples
 * Demonstrates how to use the enhanced API integrations
 */

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

/**
 * Example: Upload a single file with progress tracking
 */
export async function uploadSingleFileExample() {
  try {
    // Create a mock file (in real usage, this would come from file input)
    const file = new File(['mock content'], 'vehicle-photo.jpg', { type: 'image/jpeg' })
    
    // Progress callback
    const onProgress = (progress) => {
      `)
    }
    
    // Upload with custom options
    const result = await UploadFile({
      file,
      path: null, // Auto-generate path
      options: {
        optimize: true,
        generateThumbnail: true,
        maxSize: 5 * 1024 * 1024, // 5MB limit
        compressionOptions: {
          quality: 0.8,
          maxWidth: 1600
        }
      },
      onProgress
    })
    
    console.log('Upload successful:', {
      url: result.file_url,
      path: result.path,
      thumbnail: result.thumbnail?.publicUrl,
      metadata: result.metadata
    })
    
    return result
  } catch (error) {
    console.error('Upload failed:', error.message)
    throw error
  }
}

/**
 * Example: Upload multiple vehicle images
 */
export async function uploadVehicleImagesExample(imageFiles) {
  try {
    const onProgress = (progress) => {
    }
    
    const results = await UploadMultipleFiles({
      files: imageFiles,
      folderPath: 'vehicles',
      options: {
        optimize: true,
        generateThumbnail: true,
        maxSize: 8 * 1024 * 1024 // 8MB per file
      },
      onProgress
    })
    
    const successfulUploads = results.filter(r => r.success)
    const failedUploads = results.filter(r => !r.success)
    
    if (failedUploads.length > 0) {
    }
    
    return {
      successful: successfulUploads,
      failed: failedUploads,
      urls: successfulUploads.map(r => r.file_url)
    }
  } catch (error) {
    console.error('Multiple upload failed:', error.message)
    throw error
  }
}

/**
 * Example: Send contact inquiry email
 */
export async function sendContactInquiryExample(contactData) {
  try {
    const emailPayload = {
      to: 'zometauto@gmail.com',
      subject: `פנייה חדשה מהאתר - ${contactData.subject}`,
      message: `
שלום,

התקבלה פנייה חדשה מהאתר:

פרטי הפונה:
שם: ${contactData.name}
טלפון: ${contactData.phone}
אימייל: ${contactData.email}

נושא: ${contactData.subject}

הודעה:
${contactData.message}

---
נשלח אוטומטית מאתר זומט
${new Date().toLocaleString('he-IL')}
      `,
      from: 'noreply@zomet.co.il',
      replyTo: contactData.email,
      options: {
        maxRetries: 3
      }
    }
    
    const result = await SendEmail(emailPayload)
    
    console.log('Email sent successfully:', {
      id: result.id,
      provider: result.provider,
      timestamp: result.timestamp
    })
    
    return result
  } catch (error) {
    console.error('Email sending failed:', error.message)
    throw error
  }
}

/**
 * Example: Get AI-powered vehicle pricing
 */
export async function getVehiclePricingExample(vehicleData) {
  try {
    const prompt = `
אנא הערך את מחיר הרכב הבא:

פרטי הרכב:
יצרן: ${vehicleData.manufacturer}
דגם: ${vehicleData.model}
שנת ייצור: ${vehicleData.year}
קילומטראז': ${vehicleData.kilometers} ק"מ
סוג דלק: ${vehicleData.fuelType}
תיבת הילוכים: ${vehicleData.transmission}
יד: ${vehicleData.hand}
מצב כללי: ${vehicleData.condition}

אנא ספק הערכת מחיר מפורטת עם נימוקים.
    `
    
    const result = await InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gpt-4',
      max_tokens: 800,
      temperature: 0.7,
      context: {
        vehicle: vehicleData,
        requestType: 'pricing'
      },
      options: {
        maxRetries: 2
      }
    })
    
    console.log('AI pricing analysis:', {
      response: result.response,
      model: result.model,
      confidence: result.confidence,
      provider: result.provider
    })
    
    return result
  } catch (error) {
    console.error('AI pricing failed:', error.message)
    throw error
  }
}

/**
 * Example: Generate vehicle description with AI
 */
export async function generateVehicleDescriptionExample(vehicleData) {
  try {
    const prompt = `
צור תיאור מקצועי ומושך לרכב הבא למודעת מכירה:

${vehicleData.manufacturer} ${vehicleData.model} ${vehicleData.year}
קילומטראז': ${vehicleData.kilometers} ק"מ
מחיר: ₪${vehicleData.price?.toLocaleString()}

התיאור צריך להיות:
- באורך של 2-3 פסקאות
- מקצועי ומושך
- מדגיש את היתרונות של הרכב
- בעברית

אנא כתב תיאור שיעזור למכור את הרכב.
    `
    
    const result = await InvokeLLM({
      prompt,
      add_context_from_internet: false,
      model: 'gpt-4',
      max_tokens: 500,
      temperature: 0.8,
      context: {
        vehicle: vehicleData,
        requestType: 'description'
      }
    })
    
    return result.response
  } catch (error) {
    console.error('Description generation failed:', error.message)
    return null
  }
}

/**
 * Example: File management operations
 */
export async function fileManagementExample() {
  try {
    // Get file URL
    const publicUrl = GetFileUrl({ path: 'vehicles/sample-image.jpg' })
    
    // Get signed URL for private access
    const signedUrl = await GetSignedUrl({ 
      path: 'private/document.pdf',
      expiresIn: 3600 // 1 hour
    })
    
    // Delete single file
    const deleteResult = await DeleteFile({ 
      path: 'temp/old-image.jpg',
      options: { maxRetries: 2 }
    })
    
    // Delete multiple files
    const batchDeleteResult = await DeleteMultipleFiles({
      paths: [
        'temp/file1.jpg',
        'temp/file2.jpg',
        'temp/file3.jpg'
      ],
      options: { maxRetries: 1 }
    })
    
    return {
      publicUrl,
      signedUrl,
      deleteResult,
      batchDeleteResult
    }
  } catch (error) {
    console.error('File management failed:', error.message)
    throw error
  }
}

/**
 * Example: System health check
 */
export async function systemHealthCheckExample() {
  try {
    const health = await HealthCheck()
    
    console.log('System Health Status:', {
      overall: health.healthy ? '✅ Healthy' : '❌ Unhealthy',
      auth: health.checks.auth ? '✅' : '❌',
      storage: health.checks.storage ? '✅' : '❌',
      functions: health.checks.functions ? '✅' : '❌',
      timestamp: health.timestamp
    })
    
    if (!health.healthy) {
    }
    
    return health
  } catch (error) {
    console.error('Health check failed:', error.message)
    return { healthy: false, error: error.message }
  }
}

/**
 * Example: Complete vehicle listing workflow
 */
export async function completeVehicleListingWorkflow(vehicleData, imageFiles) {
  try {
    
    // Step 1: Health check
    const health = await systemHealthCheckExample()
    if (!health.healthy) {
    }
    
    // Step 2: Upload vehicle images
    const uploadResults = await uploadVehicleImagesExample(imageFiles)
    
    // Step 3: Generate AI description
    const aiDescription = await generateVehicleDescriptionExample(vehicleData)
    
    // Step 4: Get AI pricing suggestion
    const pricingAnalysis = await getVehiclePricingExample(vehicleData)
    
    // Step 5: Send notification email
    const emailResult = await sendContactInquiryExample({
      name: 'System',
      email: 'system@zomet.co.il',
      phone: 'N/A',
      subject: 'רכב חדש נוסף למערכת',
      message: `רכב חדש נוסף: ${vehicleData.manufacturer} ${vehicleData.model} ${vehicleData.year}`
    })
    
    
    return {
      images: uploadResults.urls,
      description: aiDescription,
      pricing: pricingAnalysis.response,
      notification: emailResult.id,
      health: health.healthy
    }
  } catch (error) {
    console.error('Workflow failed:', error.message)
    throw error
  }
}

// Export all examples
export default {
  uploadSingleFileExample,
  uploadVehicleImagesExample,
  sendContactInquiryExample,
  getVehiclePricingExample,
  generateVehicleDescriptionExample,
  fileManagementExample,
  systemHealthCheckExample,
  completeVehicleListingWorkflow
}