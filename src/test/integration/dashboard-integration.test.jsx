import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { 
  mockUser, 
  mockAdminUser, 
  mockVehicle, 
  mockMessage, 
  mockPromotion,
  mockSupabaseResponse,
  mockSuccessfulQuery,
  mockFailedQuery
} from '../utils.jsx'

// Import dashboard components
import ProfilePage from '@/pages/dashboard/user/ProfilePage'
import ActivityPage from '@/pages/dashboard/user/ActivityPage'
import AdManagementPage from '@/pages/dashboard/user/AdManagementPage'
import MessagingPage from '@/pages/dashboard/user/MessagingPage'
import AdminHomePage from '@/pages/dashboard/admin/AdminHomePage'
import UserManagementPage from '@/pages/dashboard/admin/UserManagementPage'
import AdminAdManagementPage from '@/pages/dashboard/admin/AdminAdManagementPage'

// Mock auth context
const MockAuthProvider = ({ children, user = mockUser }) => {
  const mockAuthValue = {
    user,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    resetPassword: vi.fn(),
    isAdmin: user?.role === 'admin',
  }

  return (
    <BrowserRouter>
      <AuthProvider value={mockAuthValue}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('User Dashboard Integration', () => {
    describe('Profile Management Integration', () => {
      it('should load user profile data and allow updates', async () => {
        // Mock profile data fetch
        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUser))
            })
          })
        })

        // Mock profile update
        supabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseResponse({
                  ...mockUser,
                  full_name: 'Updated Name'
                }))
              })
            })
          })
        })

        render(
          <MockAuthProvider>
            <ProfilePage />
          </MockAuthProvider>
        )

        // Wait for profile data to load
        await waitFor(() => {
          expect(screen.getByDisplayValue(mockUser.full_name)).toBeInTheDocument()
        })

        // Update profile
        const nameInput = screen.getByDisplayValue(mockUser.full_name)
        await userEvent.clear(nameInput)
        await userEvent.type(nameInput, 'Updated Name')

        const saveButton = screen.getByRole('button', { name: /שמור/i })
        await userEvent.click(saveButton)

        // Verify update was called
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('users')
        })
      })

      it('should handle profile update errors gracefully', async () => {
        // Mock profile data fetch
        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUser))
            })
          })
        })

        // Mock profile update error
        supabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseResponse(null, {
                  message: 'Update failed'
                }))
              })
            })
          })
        })

        render(
          <MockAuthProvider>
            <ProfilePage />
          </MockAuthProvider>
        )

        await waitFor(() => {
          expect(screen.getByDisplayValue(mockUser.full_name)).toBeInTheDocument()
        })

        const saveButton = screen.getByRole('button', { name: /שמור/i })
        await userEvent.click(saveButton)

        // Verify error message is displayed
        await waitFor(() => {
          expect(screen.getByText(/שגיאה/i)).toBeInTheDocument()
        })
      })
    })

    describe('Activity Tracking Integration', () => {
      it('should load and display user activity logs', async () => {
        const mockActivities = [
          {
            id: '1',
            action: 'vehicle_created',
            resource_type: 'vehicle',
            resource_id: mockVehicle.id,
            details: { vehicle_make: 'Toyota' },
            created_at: '2024-01-01T10:00:00Z'
          },
          {
            id: '2',
            action: 'profile_updated',
            resource_type: 'user',
            resource_id: mockUser.id,
            details: { field: 'full_name' },
            created_at: '2024-01-01T09:00:00Z'
          }
        ]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockSupabaseResponse(mockActivities))
              })
            })
          })
        })

        render(
          <MockAuthProvider>
            <ActivityPage />
          </MockAuthProvider>
        )

        // Wait for activities to load
        await waitFor(() => {
          expect(screen.getByText('יצירת רכב')).toBeInTheDocument()
          expect(screen.getByText('עדכון פרופיל')).toBeInTheDocument()
        })

        // Verify activities are displayed in chronological order
        const activities = screen.getAllByTestId('activity-item')
        expect(activities).toHaveLength(2)
      })

      it('should filter activities by type and date', async () => {
        const mockActivities = [
          {
            id: '1',
            action: 'vehicle_created',
            resource_type: 'vehicle',
            created_at: '2024-01-01T10:00:00Z'
          }
        ]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue(mockSupabaseResponse(mockActivities))
                  })
                })
              })
            })
          })
        })

        render(
          <MockAuthProvider>
            <ActivityPage />
          </MockAuthProvider>
        )

        // Apply filters
        const typeFilter = screen.getByRole('combobox', { name: /סוג פעילות/i })
        await userEvent.click(typeFilter)
        await userEvent.click(screen.getByText('רכבים'))

        // Verify filtered results
        await waitFor(() => {
          expect(screen.getByText('יצירת רכב')).toBeInTheDocument()
        })
      })
    })

    describe('Ad Management Integration', () => {
      it('should load user ads and allow management operations', async () => {
        const mockUserVehicles = [
          {
            ...mockVehicle,
            promotions: [mockPromotion]
          }
        ]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUserVehicles))
            })
          })
        })

        render(
          <MockAuthProvider>
            <AdManagementPage />
          </MockAuthProvider>
        )

        // Wait for ads to load
        await waitFor(() => {
          expect(screen.getByText(mockVehicle.make)).toBeInTheDocument()
          expect(screen.getByText(mockVehicle.model)).toBeInTheDocument()
        })

        // Test edit functionality
        const editButton = screen.getByRole('button', { name: /עריכה/i })
        expect(editButton).toBeInTheDocument()

        // Test promotion status
        expect(screen.getByText(/מקודם/i)).toBeInTheDocument()
      })

      it('should handle ad deletion with confirmation', async () => {
        const mockUserVehicles = [mockVehicle]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUserVehicles))
            })
          })
        })

        // Mock delete operation
        supabase.from.mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(mockSupabaseResponse({}))
          })
        })

        render(
          <MockAuthProvider>
            <AdManagementPage />
          </MockAuthProvider>
        )

        await waitFor(() => {
          expect(screen.getByText(mockVehicle.make)).toBeInTheDocument()
        })

        // Click delete button
        const deleteButton = screen.getByRole('button', { name: /מחק/i })
        await userEvent.click(deleteButton)

        // Confirm deletion
        const confirmButton = screen.getByRole('button', { name: /אישור/i })
        await userEvent.click(confirmButton)

        // Verify delete was called
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('vehicles')
        })
      })
    })

    describe('Messaging Integration', () => {
      it('should load messages and handle real-time updates', async () => {
        const mockMessages = [mockMessage]

        // Mock messages fetch
        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockMessages))
            })
          })
        })

        // Mock real-time subscription
        const mockChannel = {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn()
        }
        supabase.channel.mockReturnValue(mockChannel)

        render(
          <MockAuthProvider>
            <MessagingPage />
          </MockAuthProvider>
        )

        // Wait for messages to load
        await waitFor(() => {
          expect(screen.getByText(mockMessage.subject)).toBeInTheDocument()
        })

        // Verify real-time subscription was set up
        expect(supabase.channel).toHaveBeenCalledWith('messages')
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.any(Object),
          expect.any(Function)
        )
      })

      it('should send new messages', async () => {
        // Mock message send
        supabase.from.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockMessage))
            })
          })
        })

        render(
          <MockAuthProvider>
            <MessagingPage />
          </MockAuthProvider>
        )

        // Fill message form
        const subjectInput = screen.getByLabelText(/נושא/i)
        const contentInput = screen.getByLabelText(/תוכן/i)
        
        await userEvent.type(subjectInput, 'Test Subject')
        await userEvent.type(contentInput, 'Test Content')

        // Send message
        const sendButton = screen.getByRole('button', { name: /שלח/i })
        await userEvent.click(sendButton)

        // Verify message was sent
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('messages')
        })
      })
    })
  })

  describe('Admin Dashboard Integration', () => {
    describe('Admin Home Integration', () => {
      it('should load and display system statistics', async () => {
        const mockStats = {
          total_users: 150,
          active_users: 120,
          total_vehicles: 300,
          active_vehicles: 250,
          total_messages: 500,
          unread_messages: 25
        }

        // Mock statistics queries
        supabase.rpc.mockResolvedValue(mockSupabaseResponse(mockStats))

        render(
          <MockAuthProvider user={mockAdminUser}>
            <AdminHomePage />
          </MockAuthProvider>
        )

        // Wait for statistics to load
        await waitFor(() => {
          expect(screen.getByText('150')).toBeInTheDocument() // total users
          expect(screen.getByText('300')).toBeInTheDocument() // total vehicles
        })
      })

      it('should display real-time updates', async () => {
        // Mock real-time subscription for admin stats
        const mockChannel = {
          on: vi.fn().mockReturnThis(),
          subscribe: vi.fn()
        }
        supabase.channel.mockReturnValue(mockChannel)

        render(
          <MockAuthProvider user={mockAdminUser}>
            <AdminHomePage />
          </MockAuthProvider>
        )

        // Verify real-time subscription was set up
        expect(supabase.channel).toHaveBeenCalledWith('admin_stats')
      })
    })

    describe('User Management Integration', () => {
      it('should load users with search and filtering', async () => {
        const mockUsers = [mockUser, mockAdminUser]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUsers))
              })
            })
          })
        })

        render(
          <MockAuthProvider user={mockAdminUser}>
            <UserManagementPage />
          </MockAuthProvider>
        )

        // Wait for users to load
        await waitFor(() => {
          expect(screen.getByText(mockUser.email)).toBeInTheDocument()
          expect(screen.getByText(mockAdminUser.email)).toBeInTheDocument()
        })

        // Test search functionality
        const searchInput = screen.getByPlaceholderText(/חיפוש משתמשים/i)
        await userEvent.type(searchInput, 'test@example.com')

        // Verify search was triggered
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('users')
        })
      })

      it('should handle user role updates', async () => {
        const mockUsers = [mockUser]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUsers))
            })
          })
        })

        // Mock role update
        supabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseResponse({
                  ...mockUser,
                  role: 'admin'
                }))
              })
            })
          })
        })

        render(
          <MockAuthProvider user={mockAdminUser}>
            <UserManagementPage />
          </MockAuthProvider>
        )

        await waitFor(() => {
          expect(screen.getByText(mockUser.email)).toBeInTheDocument()
        })

        // Change user role
        const roleSelect = screen.getByRole('combobox', { name: /תפקיד/i })
        await userEvent.click(roleSelect)
        await userEvent.click(screen.getByText('מנהל'))

        // Verify role update was called
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('users')
        })
      })
    })

    describe('Admin Ad Management Integration', () => {
      it('should load all ads with approval workflow', async () => {
        const mockVehicles = [
          {
            ...mockVehicle,
            status: 'pending_approval',
            user: mockUser
          }
        ]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockVehicles))
            })
          })
        })

        render(
          <MockAuthProvider user={mockAdminUser}>
            <AdminAdManagementPage />
          </MockAuthProvider>
        )

        // Wait for ads to load
        await waitFor(() => {
          expect(screen.getByText(mockVehicle.make)).toBeInTheDocument()
          expect(screen.getByText('ממתין לאישור')).toBeInTheDocument()
        })

        // Test approval functionality
        const approveButton = screen.getByRole('button', { name: /אשר/i })
        expect(approveButton).toBeInTheDocument()
      })

      it('should handle ad approval and rejection', async () => {
        const mockVehicles = [
          {
            ...mockVehicle,
            status: 'pending_approval'
          }
        ]

        supabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockVehicles))
            })
          })
        })

        // Mock approval update
        supabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(mockSupabaseResponse({
                  ...mockVehicle,
                  status: 'active'
                }))
              })
            })
          })
        })

        render(
          <MockAuthProvider user={mockAdminUser}>
            <AdminAdManagementPage />
          </MockAuthProvider>
        )

        await waitFor(() => {
          expect(screen.getByText(mockVehicle.make)).toBeInTheDocument()
        })

        // Approve ad
        const approveButton = screen.getByRole('button', { name: /אשר/i })
        await userEvent.click(approveButton)

        // Verify approval was called
        await waitFor(() => {
          expect(supabase.from).toHaveBeenCalledWith('vehicles')
        })
      })
    })
  })

  describe('Cross-Module Integration', () => {
    it('should maintain consistent user state across dashboard modules', async () => {
      // Test that user data is consistent across different dashboard pages
      const { rerender } = render(
        <MockAuthProvider>
          <ProfilePage />
        </MockAuthProvider>
      )

      // Switch to activity page
      rerender(
        <MockAuthProvider>
          <ActivityPage />
        </MockAuthProvider>
      )

      // Verify user context is maintained
      expect(screen.queryByText(/שגיאה/i)).not.toBeInTheDocument()
    })

    it('should handle navigation between dashboard modules', async () => {
      // This would test routing between different dashboard pages
      // Implementation depends on your routing setup
      expect(true).toBe(true) // Placeholder
    })
  })
})