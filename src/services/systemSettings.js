import { supabase } from '@/lib/supabase'
import { 
  handleApiError, 
  logError, 
  validateRequiredFields, 
  sanitizeInput,
  createSuccessResponse 
} from '@/utils/errorHandler'

/**
 * System Settings service for Supabase operations
 * Handles global configuration management, feature toggles, and system parameters
 */

export const systemSettingsService = {
  /**
   * Get system setting by key
   * @param {string} settingKey - Setting key
   * @returns {Promise<Object>} Response with setting value or error
   */
  async getSetting(settingKey) {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', settingKey)
        .single()

      if (error && error.code !== 'PGRST116') {
        logError(error, 'systemSettingsService.getSetting', { settingKey })
        throw error
      }

      return createSuccessResponse(data || null)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.getSetting')
    }
  },

  /**
   * Get multiple system settings
   * @param {Array} settingKeys - Array of setting keys
   * @returns {Promise<Object>} Response with settings or error
   */
  async getSettings(settingKeys = []) {
    try {
      let query = supabase
        .from('system_settings')
        .select('*')

      if (settingKeys.length > 0) {
        query = query.in('setting_key', settingKeys)
      }

      const { data, error } = await query

      if (error) {
        logError(error, 'systemSettingsService.getSettings', { settingKeys })
        throw error
      }

      // Convert array to key-value object
      const settings = {}
      data.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value
      })

      return createSuccessResponse(settings)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.getSettings')
    }
  },

  /**
   * Get all public system settings
   * @returns {Promise<Object>} Response with public settings or error
   */
  async getPublicSettings() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, description')
        .eq('is_public', true)

      if (error) {
        logError(error, 'systemSettingsService.getPublicSettings')
        throw error
      }

      const settings = {}
      data.forEach(setting => {
        settings[setting.setting_key] = {
          value: setting.setting_value,
          description: setting.description
        }
      })

      return createSuccessResponse(settings)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.getPublicSettings')
    }
  },

  /**
   * Get all system settings (admin only)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Response with all settings or error
   */
  async getAllSettings(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לצפות בהגדרות המערכת')
      }

      const {
        page = 1,
        pageSize = 50,
        category = null,
        searchTerm = null,
        sortBy = 'setting_key'
      } = options

      let query = supabase
        .from('system_settings')
        .select(`
          *,
          updater:updated_by(id, full_name, email)
        `)

      // Apply filters
      if (category) {
        query = query.ilike('setting_key', `${category}%`)
      }
      if (searchTerm) {
        query = query.or(`setting_key.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Apply sorting
      const isDescending = sortBy.startsWith('-')
      const field = isDescending ? sortBy.substring(1) : sortBy
      const ascending = !isDescending
      query = query.order(field, { ascending })

      // Apply pagination
      const offset = (page - 1) * pageSize
      query = query.range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        logError(error, 'systemSettingsService.getAllSettings', options)
        throw error
      }

      return createSuccessResponse({
        settings: data || [],
        pagination: {
          page,
          pageSize,
          total: count,
          hasMore: count > offset + pageSize
        }
      })
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.getAllSettings')
    }
  },

  /**
   * Set system setting
   * @param {string} settingKey - Setting key
   * @param {*} settingValue - Setting value
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with updated setting or error
   */
  async setSetting(settingKey, settingValue, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לעדכן הגדרות המערכת')
      }

      const {
        description = null,
        isPublic = false
      } = options

      const settingData = {
        setting_key: sanitizeInput(settingKey),
        setting_value: settingValue,
        description: description ? sanitizeInput(description) : null,
        is_public: isPublic,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('system_settings')
        .upsert([settingData])
        .select(`
          *,
          updater:updated_by(id, full_name, email)
        `)
        .single()

      if (error) {
        logError(error, 'systemSettingsService.setSetting', { settingKey, settingValue, options })
        throw error
      }

      // Log the setting change
      await this.logSettingChange(user.id, 'setting_updated', settingKey, settingValue)

      return createSuccessResponse(data, 'הגדרה עודכנה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.setSetting')
    }
  },

  /**
   * Set multiple system settings
   * @param {Object} settings - Object with key-value pairs
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with updated settings or error
   */
  async setSettings(settings, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לעדכן הגדרות המערכת')
      }

      const {
        defaultDescription = null,
        defaultIsPublic = false
      } = options

      const settingsData = Object.entries(settings).map(([key, value]) => ({
        setting_key: sanitizeInput(key),
        setting_value: value,
        description: defaultDescription ? sanitizeInput(defaultDescription) : null,
        is_public: defaultIsPublic,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('system_settings')
        .upsert(settingsData)
        .select(`
          *,
          updater:updated_by(id, full_name, email)
        `)

      if (error) {
        logError(error, 'systemSettingsService.setSettings', { settings, options })
        throw error
      }

      // Log the setting changes
      for (const [key, value] of Object.entries(settings)) {
        await this.logSettingChange(user.id, 'setting_updated', key, value)
      }

      return createSuccessResponse(data, `${data.length} הגדרות עודכנו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.setSettings')
    }
  },

  /**
   * Delete system setting
   * @param {string} settingKey - Setting key
   * @returns {Promise<Object>} Response with success status or error
   */
  async deleteSetting(settingKey) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה למחוק הגדרות המערכת')
      }

      // Get current setting value for logging
      const currentSetting = await this.getSetting(settingKey)

      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('setting_key', settingKey)

      if (error) {
        logError(error, 'systemSettingsService.deleteSetting', { settingKey })
        throw error
      }

      // Log the setting deletion
      await this.logSettingChange(user.id, 'setting_deleted', settingKey, currentSetting.data?.setting_value)

      return createSuccessResponse({ deleted: true }, 'הגדרה נמחקה בהצלחה')
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.deleteSetting')
    }
  },

  /**
   * Get feature flags
   * @returns {Promise<Object>} Response with feature flags or error
   */
  async getFeatureFlags() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .ilike('setting_key', 'feature_%')

      if (error) {
        logError(error, 'systemSettingsService.getFeatureFlags')
        throw error
      }

      const featureFlags = {}
      data.forEach(setting => {
        const flagName = setting.setting_key.replace('feature_', '')
        featureFlags[flagName] = setting.setting_value
      })

      return createSuccessResponse(featureFlags)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.getFeatureFlags')
    }
  },

  /**
   * Set feature flag
   * @param {string} flagName - Feature flag name
   * @param {boolean} enabled - Whether the feature is enabled
   * @param {string} description - Feature description
   * @returns {Promise<Object>} Response with updated feature flag or error
   */
  async setFeatureFlag(flagName, enabled, description = null) {
    try {
      const settingKey = `feature_${flagName}`
      return await this.setSetting(settingKey, enabled, {
        description: description || `Feature flag for ${flagName}`,
        isPublic: true
      })
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.setFeatureFlag')
    }
  },

  /**
   * Get system configuration categories
   * @returns {Promise<Object>} Response with configuration categories or error
   */
  async getConfigurationCategories() {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key')

      if (error) {
        logError(error, 'systemSettingsService.getConfigurationCategories')
        throw error
      }

      // Extract categories from setting keys (assuming format: category_setting_name)
      const categories = new Set()
      data.forEach(setting => {
        const parts = setting.setting_key.split('_')
        if (parts.length > 1) {
          categories.add(parts[0])
        }
      })

      const categoryList = Array.from(categories).map(category => ({
        name: category,
        display_name: this.getCategoryDisplayName(category),
        count: data.filter(s => s.setting_key.startsWith(category + '_')).length
      }))

      return createSuccessResponse(categoryList)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.getConfigurationCategories')
    }
  },

  /**
   * Export system settings
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Response with exported settings or error
   */
  async exportSettings(options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לייצא הגדרות המערכת')
      }

      const {
        format = 'json',
        includePrivate = false,
        category = null
      } = options

      let query = supabase
        .from('system_settings')
        .select('setting_key, setting_value, description, is_public, updated_at')

      if (!includePrivate) {
        query = query.eq('is_public', true)
      }

      if (category) {
        query = query.ilike('setting_key', `${category}_%`)
      }

      const { data, error } = await query.order('setting_key')

      if (error) {
        logError(error, 'systemSettingsService.exportSettings', options)
        throw error
      }

      let exportData = data

      if (format === 'csv') {
        exportData = this.convertSettingsToCSV(data)
      } else if (format === 'env') {
        exportData = this.convertSettingsToEnv(data)
      }

      // Log the export
      await this.logSettingChange(user.id, 'settings_exported', 'system', { 
        format, 
        includePrivate, 
        category,
        count: data.length 
      })

      return createSuccessResponse({
        format,
        exported_at: new Date().toISOString(),
        count: data.length,
        data: exportData
      })
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.exportSettings')
    }
  },

  /**
   * Import system settings
   * @param {Object} settingsData - Settings data to import
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Response with import results or error
   */
  async importSettings(settingsData, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לייבא הגדרות למערכת')
      }

      const {
        overwrite = false,
        validateOnly = false
      } = options

      // Validate settings data
      const validationResults = this.validateSettingsData(settingsData)
      if (!validationResults.isValid) {
        throw new Error(`Invalid settings data: ${validationResults.errors.join(', ')}`)
      }

      if (validateOnly) {
        return createSuccessResponse({
          validation: validationResults,
          would_import: validationResults.validSettings.length,
          would_skip: validationResults.invalidSettings.length
        })
      }

      const settingsToImport = validationResults.validSettings.map(setting => ({
        ...setting,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }))

      let importedCount = 0
      let skippedCount = 0
      const errors = []

      for (const setting of settingsToImport) {
        try {
          // Check if setting exists
          const existing = await this.getSetting(setting.setting_key)
          
          if (existing.data && !overwrite) {
            skippedCount++
            continue
          }

          await this.setSetting(setting.setting_key, setting.setting_value, {
            description: setting.description,
            isPublic: setting.is_public
          })
          
          importedCount++
        } catch (error) {
          errors.push({
            setting_key: setting.setting_key,
            error: error.message
          })
        }
      }

      // Log the import
      await this.logSettingChange(user.id, 'settings_imported', 'system', {
        imported_count: importedCount,
        skipped_count: skippedCount,
        error_count: errors.length,
        overwrite
      })

      return createSuccessResponse({
        imported: importedCount,
        skipped: skippedCount,
        errors: errors.length,
        error_details: errors
      }, `${importedCount} הגדרות יובאו בהצלחה`)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.importSettings')
    }
  },

  /**
   * Reset settings to defaults
   * @param {Array} settingKeys - Setting keys to reset (optional, resets all if not provided)
   * @returns {Promise<Object>} Response with reset results or error
   */
  async resetToDefaults(settingKeys = []) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User must be authenticated')

      // Check if user is admin
      const isAdmin = await this.checkAdminPermission(user)
      if (!isAdmin) {
        throw new Error('אין לך הרשאה לאפס הגדרות המערכת')
      }

      const defaultSettings = this.getDefaultSettings()
      let settingsToReset = defaultSettings

      if (settingKeys.length > 0) {
        settingsToReset = defaultSettings.filter(setting => 
          settingKeys.includes(setting.setting_key)
        )
      }

      const resetResults = await this.setSettings(
        settingsToReset.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value
          return acc
        }, {}),
        {
          defaultDescription: 'Default system setting',
          defaultIsPublic: false
        }
      )

      // Log the reset
      await this.logSettingChange(user.id, 'settings_reset', 'system', {
        reset_count: settingsToReset.length,
        setting_keys: settingKeys
      })

      return createSuccessResponse({
        reset_count: settingsToReset.length,
        settings: resetResults.data
      }, `${settingsToReset.length} הגדרות אופסו לברירת המחדל`)
    } catch (error) {
      return handleApiError(error, 'systemSettingsService.resetToDefaults')
    }
  },

  // Helper methods

  /**
   * Check if user has admin permission
   * @private
   */
  async checkAdminPermission(user) {
    try {
      // Check if user is the system admin
      if (user.email === 'zometauto@gmail.com') {
        return true
      }

      // Check user role in database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) return false

      return userProfile?.role === 'admin' || userProfile?.role === 'moderator'
    } catch (error) {
      logError(error, 'systemSettingsService.checkAdminPermission')
      return false
    }
  },

  /**
   * Log setting change
   * @private
   */
  async logSettingChange(userId, action, settingKey, settingValue) {
    try {
      await supabase
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action,
          table_name: 'system_settings',
          record_id: settingKey,
          new_values: { setting_key: settingKey, setting_value: settingValue },
          category: 'system_configuration',
          severity: 'info'
        }])
    } catch (error) {
      // Don't throw error for audit logging - it's not critical
      logError(error, 'systemSettingsService.logSettingChange')
    }
  },

  /**
   * Get category display name
   * @private
   */
  getCategoryDisplayName(category) {
    const displayNames = {
      'feature': 'תכונות',
      'email': 'דוא"ל',
      'payment': 'תשלומים',
      'security': 'אבטחה',
      'ui': 'ממשק משתמש',
      'api': 'API',
      'maintenance': 'תחזוקה',
      'analytics': 'אנליטיקה'
    }
    return displayNames[category] || category
  },

  /**
   * Convert settings to CSV format
   * @private
   */
  convertSettingsToCSV(settings) {
    const headers = ['setting_key', 'setting_value', 'description', 'is_public', 'updated_at']
    const csvRows = [headers.join(',')]

    settings.forEach(setting => {
      const values = headers.map(header => {
        const value = setting[header]
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  },

  /**
   * Convert settings to environment file format
   * @private
   */
  convertSettingsToEnv(settings) {
    return settings
      .map(setting => {
        const key = setting.setting_key.toUpperCase()
        const value = typeof setting.setting_value === 'object' 
          ? JSON.stringify(setting.setting_value)
          : setting.setting_value
        return `${key}=${value}`
      })
      .join('\n')
  },

  /**
   * Validate settings data
   * @private
   */
  validateSettingsData(settingsData) {
    const validSettings = []
    const invalidSettings = []
    const errors = []

    if (!Array.isArray(settingsData)) {
      errors.push('Settings data must be an array')
      return { isValid: false, errors, validSettings, invalidSettings }
    }

    settingsData.forEach((setting, index) => {
      const settingErrors = []

      if (!setting.setting_key || typeof setting.setting_key !== 'string') {
        settingErrors.push(`Invalid setting_key at index ${index}`)
      }

      if (setting.setting_value === undefined) {
        settingErrors.push(`Missing setting_value at index ${index}`)
      }

      if (settingErrors.length > 0) {
        invalidSettings.push({ ...setting, errors: settingErrors })
        errors.push(...settingErrors)
      } else {
        validSettings.push(setting)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      validSettings,
      invalidSettings
    }
  },

  /**
   * Get default system settings
   * @private
   */
  getDefaultSettings() {
    return [
      {
        setting_key: 'feature_promotions',
        setting_value: true,
        description: 'Enable vehicle promotions feature',
        is_public: true
      },
      {
        setting_key: 'feature_messaging',
        setting_value: true,
        description: 'Enable internal messaging system',
        is_public: true
      },
      {
        setting_key: 'feature_notifications',
        setting_value: true,
        description: 'Enable notifications system',
        is_public: true
      },
      {
        setting_key: 'ui_items_per_page',
        setting_value: 20,
        description: 'Default number of items per page',
        is_public: true
      },
      {
        setting_key: 'security_session_timeout',
        setting_value: 3600,
        description: 'Session timeout in seconds',
        is_public: false
      },
      {
        setting_key: 'maintenance_mode',
        setting_value: false,
        description: 'System maintenance mode',
        is_public: true
      }
    ]
  }
}

export default systemSettingsService