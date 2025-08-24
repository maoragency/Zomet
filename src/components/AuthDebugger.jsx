/**
 * Auth Debugger Component
 * Shows current authentication state for debugging
 */

import React from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function AuthDebugger() {
  const { user, session, loading, isAdmin, permissions, isEmailVerified } = useAuth()

  // Only show in development
  if (import.meta.env.PROD) return null

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">🔍 Auth Debug</div>
      <div className="space-y-1">
        <div>Loading: {loading ? '✅' : '❌'}</div>
        <div>Session: {session?.user?.email || '❌'}</div>
        <div>User: {user?.email || '❌'}</div>
        <div>User Name: {user?.full_name || '❌'}</div>
        <div>Admin: {isAdmin ? '✅' : '❌'}</div>
        <div>Email Verified: {isEmailVerified ? '✅' : '❌'}</div>
        <div>Permissions: {permissions.length}</div>
        {user && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs opacity-75">User ID: {user.id?.slice(0, 8)}...</div>
            <div className="text-xs opacity-75">Role: {user.role || 'N/A'}</div>
            {user.email === 'zometauto@gmail.com' && user.role !== 'admin' && (
              <div className="text-xs text-red-400 mt-1">
                ⚠️ Admin email but wrong role!
                <div className="flex gap-1 mt-1">
                  <button 
                    onClick={() => window.fixAdminRole?.()}
                    className="text-yellow-400 underline text-xs"
                  >
                    Quick Fix
                  </button>
                  <button 
                    onClick={() => window.manualAdminFix?.()}
                    className="text-blue-400 underline text-xs"
                  >
                    Manual Fix
                  </button>
                  <button 
                    onClick={() => window.applyAdminFix?.()}
                    className="text-green-400 underline text-xs"
                  >
                    Full Fix
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}