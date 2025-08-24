import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { 
  mockUser, 
  mockAdminUser, 
  mockVehicle, 
  mockPromotion,
  mockSupabaseResponse,
  mockFailedQuery
} from '../utils.jsx'

// Import admin components
import UserManagementPage from '@/pages/dashboard/admin/UserManagementPage'
import AdminAdManagementPage from '@/pages/dashboard/admin/AdminAdManagementPage'
import PromotionManagementPage from '@/pages/dashboard/admin/PromotionManagementPage'
import SystemSettingsPage from '@/pages/dashboard/admin/SystemSettingsPage'
import AuditLogsPage from '@/pages/dashboard/admin/AuditLogsPage'
import { AuthProvider } from '@/hooks/useAuth'

// Mock auth context with admin user
const MockAuthProvider = ({ children, user = mockAdminUser }) => {
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

describe('Admin Operations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('User Management Operations', () => {
    it('should load users with pagination and search', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-2', email: 'user2@example.com' },
        { ...mockUser, id: 'user-3', email: 'user3@example.com' }
      ]

      // Mock user count for pagination
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse({ count: 3 }))
          })
        })
      })

      // Mock users fetch
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
        <MockAuthProvider>
          <UserManagementPage />
        </MockAuthProvider>
      )

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText(mockUser.email)).toBeInTheDocument()
        expect(screen.getByText('user2@example.com')).toBeInTheDocument()
      })

      // Test search functionality
      const searchInput = screen.getByPlaceholderText(/חיפוש משתמשים/i)
      await userEvent.type(searchInput, 'user2')

      // Verify search was triggered
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('users')
      })
    })

    it('should update user roles and permissions', async () => {
      const mockUsers = [mockUser]

      // Mock users fetch
      supabase.from.mockReturnValueOnce({
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
                role: 'moderator'
              }))
            })
          })
        })
      })

      render(
        <MockAuthProvider>
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

      // Verify role update
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('users')
      })

      // Verify audit log creation
      expect(supabase.from).toHaveBeenCalledWith('audit_logs')
    })

    it('should deactivate and reactivate user accounts', async () => {
      const mockUsers = [mockUser]

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUsers))
          })
        })
      })

      // Mock account deactivation
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseResponse({
                ...mockUser,
                is_active: false
              }))
            })
          })
        })
      })

      render(
        <MockAuthProvider>
          <UserManagementPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(mockUser.email)).toBeInTheDocument()
      })

      // Deactivate account
      const deactivateButton = screen.getByRole('button', { name: /השבת/i })
      await userEvent.click(deactivateButton)

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /אישור/i })
      await userEvent.click(confirmButton)

      // Verify deactivation
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('users')
      })
    })

    it('should handle bulk user operations', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-2', email: 'user2@example.com' }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUsers))
          })
        })
      })

      // Mock bulk update
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(mockSupabaseResponse(mockUsers))
          })
        })
      })

      render(
        <MockAuthProvider>
          <UserManagementPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText(mockUser.email)).toBeInTheDocument()
      })

      // Select multiple users
      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[0]) // Select first user
      await userEvent.click(checkboxes[1]) // Select second user

      // Perform bulk action
      const bulkActionButton = screen.getByRole('button', { name: /פעולות מרובות/i })
      await userEvent.click(bulkActionButton)

      const bulkDeactivateButton = screen.getByRole('menuitem', { name: /השבת נבחרים/i })
      await userEvent.click(bulkDeactivateButton)

      // Verify bulk operation
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('users')
      })
    })
  })

  describe('Ad Management Operations', () => {
    it('should load ads with filtering and approval status', async () => {
      const mockVehicles = [
        {
          ...mockVehicle,
          status: 'pending_approval',
          user: mockUser
        },
        {
          ...mockVehicle,
          id: 'vehicle-2',
          status: 'active',
          user: mockUser
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockVehicles))
            })
          })
        })
      })

      render(
        <MockAuthProvider>
          <AdminAdManagementPage />
        </MockAuthProvider>
      )

      // Wait for ads to load
      await waitFor(() => {
        expect(screen.getByText('ממתין לאישור')).toBeInTheDocument()
        expect(screen.getByText('פעיל')).toBeInTheDocument()
      })

      // Test status filter
      const statusFilter = screen.getByRole('combobox', { name: /סטטוס/i })
      await userEvent.click(statusFilter)
      await userEvent.click(screen.getByText('ממתין לאישור'))

      // Verify filter was applied
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('vehicles')
      })
    })

    it('should approve ads with comments', async () => {
      const mockVehicles = [{
        ...mockVehicle,
        status: 'pending_approval',
        user: mockUser
      }]

      supabase.from.mockReturnValueOnce({
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
        <MockAuthProvider>
          <AdminAdManagementPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('ממתין לאישור')).toBeInTheDocument()
      })

      // Approve ad
      const approveButton = screen.getByRole('button', { name: /אשר/i })
      await userEvent.click(approveButton)

      // Add approval comment
      const commentInput = screen.getByLabelText(/הערה/i)
      await userEvent.type(commentInput, 'Ad approved - looks good')

      const confirmApprovalButton = screen.getByRole('button', { name: /אשר מודעה/i })
      await userEvent.click(confirmApprovalButton)

      // Verify approval
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('vehicles')
      })

      // Verify audit log
      expect(supabase.from).toHaveBeenCalledWith('audit_logs')
    })

    it('should reject ads with reasons', async () => {
      const mockVehicles = [{
        ...mockVehicle,
        status: 'pending_approval'
      }]

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockVehicles))
          })
        })
      })

      // Mock rejection update
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(mockSupabaseResponse({
                ...mockVehicle,
                status: 'rejected'
              }))
            })
          })
        })
      })

      render(
        <MockAuthProvider>
          <AdminAdManagementPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('ממתין לאישור')).toBeInTheDocument()
      })

      // Reject ad
      const rejectButton = screen.getByRole('button', { name: /דחה/i })
      await userEvent.click(rejectButton)

      // Add rejection reason
      const reasonSelect = screen.getByRole('combobox', { name: /סיבת דחייה/i })
      await userEvent.click(reasonSelect)
      await userEvent.click(screen.getByText('תמונות לא ברורות'))

      const confirmRejectionButton = screen.getByRole('button', { name: /דחה מודעה/i })
      await userEvent.click(confirmRejectionButton)

      // Verify rejection
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('vehicles')
      })
    })

    it('should handle ad performance analytics', async () => {
      const mockAnalytics = {
        total_views: 1500,
        total_contacts: 45,
        conversion_rate: 3.0,
        avg_time_on_page: 120
      }

      // Mock analytics fetch
      supabase.rpc.mockResolvedValue(mockSupabaseResponse(mockAnalytics))

      render(
        <MockAuthProvider>
          <AdminAdManagementPage />
        </MockAuthProvider>
      )

      // Click analytics button
      const analyticsButton = screen.getByRole('button', { name: /אנליטיקה/i })
      await userEvent.click(analyticsButton)

      // Verify analytics are displayed
      await waitFor(() => {
        expect(screen.getByText('1,500')).toBeInTheDocument() // views
        expect(screen.getByText('45')).toBeInTheDocument() // contacts
      })
    })
  })

  describe('Promotion Management Operations', () => {
    it('should create and manage promotion packages', async () => {
      // Mock promotion packages fetch
      const mockPackages = [
        {
          id: 'package-1',
          name: 'חבילת בסיס',
          price: 50,
          duration_days: 7,
          features: ['הדגשה', 'עדיפות בחיפוש']
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockPackages))
        })
      })

      render(
        <MockAuthProvider>
          <PromotionManagementPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('חבילת בסיס')).toBeInTheDocument()
      })

      // Create new package
      const createButton = screen.getByRole('button', { name: /חבילה חדשה/i })
      await userEvent.click(createButton)

      // Fill package details
      const nameInput = screen.getByLabelText(/שם החבילה/i)
      const priceInput = screen.getByLabelText(/מחיר/i)
      const durationInput = screen.getByLabelText(/משך בימים/i)

      await userEvent.type(nameInput, 'חבילת פרימיום')
      await userEvent.type(priceInput, '100')
      await userEvent.type(durationInput, '14')

      // Save package
      const saveButton = screen.getByRole('button', { name: /שמור/i })
      await userEvent.click(saveButton)

      // Verify package creation
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('promotion_packages')
      })
    })

    it('should track promotion effectiveness and ROI', async () => {
      const mockPromotions = [mockPromotion]
      const mockAnalytics = {
        total_revenue: 5000,
        active_promotions: 25,
        avg_roi: 2.5,
        conversion_rate: 4.2
      }

      // Mock promotions fetch
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockPromotions))
        })
      })

      // Mock analytics fetch
      supabase.rpc.mockResolvedValue(mockSupabaseResponse(mockAnalytics))

      render(
        <MockAuthProvider>
          <PromotionManagementPage />
        </MockAuthProvider>
      )

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('₪5,000')).toBeInTheDocument() // revenue
        expect(screen.getByText('25')).toBeInTheDocument() // active promotions
      })

      // View detailed analytics
      const analyticsTab = screen.getByRole('tab', { name: /אנליטיקה/i })
      await userEvent.click(analyticsTab)

      // Verify detailed metrics
      expect(screen.getByText('2.5x')).toBeInTheDocument() // ROI
      expect(screen.getByText('4.2%')).toBeInTheDocument() // conversion rate
    })
  })

  describe('System Settings Operations', () => {
    it('should manage global system configuration', async () => {
      const mockSettings = [
        {
          id: 'setting-1',
          setting_key: 'max_upload_size',
          setting_value: { value: 10, unit: 'MB' },
          description: 'Maximum file upload size'
        },
        {
          id: 'setting-2',
          setting_key: 'maintenance_mode',
          setting_value: { enabled: false },
          description: 'System maintenance mode'
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockSettings))
        })
      })

      render(
        <MockAuthProvider>
          <SystemSettingsPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Maximum file upload size')).toBeInTheDocument()
      })

      // Update setting
      const uploadSizeInput = screen.getByDisplayValue('10')
      await userEvent.clear(uploadSizeInput)
      await userEvent.type(uploadSizeInput, '20')

      const saveButton = screen.getByRole('button', { name: /שמור הגדרות/i })
      await userEvent.click(saveButton)

      // Verify setting update
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('system_settings')
      })
    })

    it('should manage feature toggles', async () => {
      const mockFeatures = [
        {
          id: 'feature-1',
          setting_key: 'enable_messaging',
          setting_value: { enabled: true },
          description: 'Enable messaging system'
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockSupabaseResponse(mockFeatures))
        })
      })

      render(
        <MockAuthProvider>
          <SystemSettingsPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Enable messaging system')).toBeInTheDocument()
      })

      // Toggle feature
      const messagingToggle = screen.getByRole('switch', { name: /messaging/i })
      await userEvent.click(messagingToggle)

      // Verify toggle update
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('system_settings')
      })
    })

    it('should handle backup and restore operations', async () => {
      render(
        <MockAuthProvider>
          <SystemSettingsPage />
        </MockAuthProvider>
      )

      // Initiate backup
      const backupButton = screen.getByRole('button', { name: /גיבוי מערכת/i })
      await userEvent.click(backupButton)

      // Confirm backup
      const confirmBackupButton = screen.getByRole('button', { name: /אשר גיבוי/i })
      await userEvent.click(confirmBackupButton)

      // Verify backup initiation
      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('create_system_backup')
      })
    })
  })

  describe('Audit Logs Operations', () => {
    it('should display comprehensive audit trail', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          user_id: mockAdminUser.id,
          action: 'user_role_updated',
          table_name: 'users',
          record_id: mockUser.id,
          old_values: { role: 'user' },
          new_values: { role: 'moderator' },
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'audit-2',
          user_id: mockAdminUser.id,
          action: 'vehicle_approved',
          table_name: 'vehicles',
          record_id: mockVehicle.id,
          old_values: { status: 'pending_approval' },
          new_values: { status: 'active' },
          created_at: '2024-01-01T09:00:00Z'
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockAuditLogs))
          })
        })
      })

      render(
        <MockAuthProvider>
          <AuditLogsPage />
        </MockAuthProvider>
      )

      // Wait for audit logs to load
      await waitFor(() => {
        expect(screen.getByText('עדכון תפקיד משתמש')).toBeInTheDocument()
        expect(screen.getByText('אישור רכב')).toBeInTheDocument()
      })

      // Test filtering by action type
      const actionFilter = screen.getByRole('combobox', { name: /סוג פעולה/i })
      await userEvent.click(actionFilter)
      await userEvent.click(screen.getByText('עדכון משתמש'))

      // Verify filter was applied
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('audit_logs')
      })
    })

    it('should export audit logs for compliance', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          action: 'user_created',
          created_at: '2024-01-01T10:00:00Z'
        }
      ]

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockAuditLogs))
          })
        })
      })

      render(
        <MockAuthProvider>
          <AuditLogsPage />
        </MockAuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('יצירת משתמש')).toBeInTheDocument()
      })

      // Export logs
      const exportButton = screen.getByRole('button', { name: /ייצא לוגים/i })
      await userEvent.click(exportButton)

      // Select date range
      const startDateInput = screen.getByLabelText(/תאריך התחלה/i)
      const endDateInput = screen.getByLabelText(/תאריך סיום/i)

      await userEvent.type(startDateInput, '2024-01-01')
      await userEvent.type(endDateInput, '2024-01-31')

      const confirmExportButton = screen.getByRole('button', { name: /ייצא/i })
      await userEvent.click(confirmExportButton)

      // Verify export was initiated
      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith('export_audit_logs', expect.any(Object))
      })
    })
  })

  describe('Error Handling in Admin Operations', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      })

      render(
        <MockAuthProvider>
          <UserManagementPage />
        </MockAuthProvider>
      )

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/שגיאה בטעינת הנתונים/i)).toBeInTheDocument()
      })
    })

    it('should handle permission errors for admin operations', async () => {
      // Mock permission error
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(mockSupabaseResponse(null, {
              code: 'PGRST116',
              message: 'Insufficient permissions'
            }))
          })
        })
      })

      render(
        <MockAuthProvider>
          <UserManagementPage />
        </MockAuthProvider>
      )

      // Attempt operation that should fail
      const roleSelect = screen.getByRole('combobox', { name: /תפקיד/i })
      await userEvent.click(roleSelect)

      // Verify permission error handling
      await waitFor(() => {
        expect(screen.getByText(/אין הרשאה/i)).toBeInTheDocument()
      })
    })
  })
})