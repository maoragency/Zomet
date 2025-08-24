import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock user data for testing
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user',
  is_active: true,
  email_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const mockAdminUser = {
  ...mockUser,
  id: '123e4567-e89b-12d3-a456-426614174001',
  email: 'admin@example.com',
  role: 'admin',
}

// Mock vehicle data for testing
export const mockVehicle = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  price: 25000,
  mileage: 50000,
  fuel_type: 'gasoline',
  transmission: 'automatic',
  color: 'white',
  description: 'Test vehicle description',
  images: ['image1.jpg', 'image2.jpg'],
  user_id: mockUser.id,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock message data for testing
export const mockMessage = {
  id: '123e4567-e89b-12d3-a456-426614174003',
  sender_id: mockUser.id,
  recipient_id: mockAdminUser.id,
  subject: 'Test Message',
  content: 'This is a test message',
  is_read: false,
  is_system_message: false,
  message_type: 'user',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock promotion data for testing
export const mockPromotion = {
  id: '123e4567-e89b-12d3-a456-426614174004',
  vehicle_id: mockVehicle.id,
  promotion_type: 'featured',
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z',
  price: 50,
  is_active: true,
  payment_status: 'paid',
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
}

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Mock Supabase responses
export const mockSupabaseResponse = (data, error = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
})

// Mock successful Supabase query
export const mockSuccessfulQuery = (data) => 
  Promise.resolve(mockSupabaseResponse(data))

// Mock failed Supabase query
export const mockFailedQuery = (error) => 
  Promise.resolve(mockSupabaseResponse(null, error))

// Create mock functions for services
export const createMockService = (methods) => {
  const mock = {}
  methods.forEach(method => {
    mock[method] = vi.fn()
  })
  return mock
}

// Wait for async operations
export const waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

// Mock file for upload testing
export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Mock form data
export const mockFormData = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  full_name: 'Test User',
  phone: '0501234567',
}

// Mock validation errors
export const mockValidationErrors = {
  email: 'כתובת אימייל לא תקינה',
  password: 'סיסמה חייבת להכיל לפחות 8 תווים',
  full_name: 'שם מלא נדרש',
}

// Mock API errors
export const mockApiErrors = {
  unauthorized: { code: 'PGRST301', message: 'JWT expired' },
  forbidden: { code: 'PGRST116', message: 'Insufficient permissions' },
  conflict: { code: '23505', message: 'Duplicate key value' },
  notFound: { code: 'PGRST116', message: 'No rows found' },
}

// Mock localStorage
export const mockLocalStorage = () => {
  const store = {}
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn(key => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
  }
}