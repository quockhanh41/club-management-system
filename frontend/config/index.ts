/**
 * Application configuration based on environment variables
 */

// Debug environment variables
console.log('🔧 Config loading:', {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  hasValue: process.env.NEXT_PUBLIC_API_BASE_URL !== undefined,
  willUse: process.env.NEXT_PUBLIC_API_BASE_URL !== undefined 
    ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'same-origin')
    : 'http://localhost:8000'
});

export const config = {
  // API Configuration
  api: {
    // If NEXT_PUBLIC_API_BASE_URL is defined (even as empty string), use it
    // Empty string = same origin (relative URLs)
    // Undefined = fallback to localhost for local development
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL !== undefined 
      ? process.env.NEXT_PUBLIC_API_BASE_URL 
      : 'http://localhost:8000',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000'),
  },
  
  // Environment
  env: process.env.NEXT_PUBLIC_ENV || 'development',
  
  // JWT Configuration
  jwt: {
    storageKey: process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'club_management_token',
    refreshStorageKey: process.env.NEXT_PUBLIC_JWT_REFRESH_STORAGE_KEY || 'club_management_refresh_token',
  },
  
  // Application Information
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Club Management System',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  },
  
  // Debug Mode
  debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
  
  // API Endpoints
  endpoints: {
    // Auth endpoints
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      logout: '/api/auth/logout',
      profile: '/api/auth/profile',
      changePassword: '/api/auth/change-password',
      refreshToken: '/api/auth/refresh',
      verifyEmail: '/api/auth/verify-email',
      resendVerification: '/api/auth/resend-verification',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
    },
    
    // Club endpoints
    clubs: {
      list: '/api/clubs',
      create: '/api/clubs',
      detail: (id: string) => `/api/clubs/${id}`,
      update: (id: string) => `/api/clubs/${id}`,
      delete: (id: string) => `/api/clubs/${id}`,
      categories: '/api/clubs/categories',
      join: (id: string) => `/api/clubs/${id}/join`,
      leave: (id: string) => `/api/clubs/${id}/leave`,
      members: (id: string) => `/api/clubs/${id}/members`,
    },
    
    // Event endpoints
    events: {
      list: '/api/events',
      create: '/api/events',
      detail: (id: string) => `/api/events/${id}`,
      update: (id: string) => `/api/events/${id}`,
      delete: (id: string) => `/api/events/${id}`,
      register: (id: string) => `/api/events/${id}/register`,
      unregister: (id: string) => `/api/events/${id}/unregister`,
    },
    
    // Campaign endpoints
    campaigns: {
      // Public endpoints
      list: '/api/campaigns',
      published: '/api/campaigns/published',
      clubPublished: (clubId: string) => `/api/campaigns/clubs/${clubId}/published`,
      detail: (id: string) => `/api/campaigns/${id}`,
      
      // User application endpoints
      apply: (id: string) => `/api/campaigns/${id}/apply`,
      applicationDetail: (campaignId: string, applicationId: string) => `/api/campaigns/${campaignId}/applications/${applicationId}`,
      userApplications: (userId: string) => `/api/users/${userId}/applications`,
      
      // Application management endpoints
      applicationDetailDirect: (applicationId: string) => `/api/applications/${applicationId}`,
      updateApplication: (applicationId: string) => `/api/applications/${applicationId}`,
      withdrawApplication: (applicationId: string) => `/api/applications/${applicationId}`,
      
      // Club manager endpoints
      createForClub: (clubId: string) => `/api/clubs/${clubId}/campaigns`,
      clubCampaigns: (clubId: string) => `/api/clubs/${clubId}/campaigns`,
      clubCampaignDetail: (clubId: string, campaignId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}`,
      
      // Campaign status management
      publishCampaign: (clubId: string, campaignId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/publish`,
      pauseCampaign: (clubId: string, campaignId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/pause`,
      resumeCampaign: (clubId: string, campaignId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/resume`,
      completeCampaign: (clubId: string, campaignId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/complete`,
      
      // Application management
      campaignApplications: (clubId: string, campaignId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/applications`,
      campaignApplicationDetail: (clubId: string, campaignId: string, applicationId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/applications/${applicationId}`,
      updateApplicationStatus: (clubId: string, campaignId: string, applicationId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/applications/${applicationId}/status`,
      approveApplication: (clubId: string, campaignId: string, applicationId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/applications/${applicationId}/approve`,
      rejectApplication: (clubId: string, campaignId: string, applicationId: string) => `/api/clubs/${clubId}/campaigns/${campaignId}/applications/${applicationId}/reject`,
      
      // Simplified application management
      simplifiedUpdateStatus: (clubId: string, applicationId: string) => `/api/clubs/${clubId}/applications/${applicationId}/status`,
      simplifiedApprove: (clubId: string, applicationId: string) => `/api/clubs/${clubId}/applications/${applicationId}/approve`,
      simplifiedReject: (clubId: string, applicationId: string) => `/api/clubs/${clubId}/applications/${applicationId}/reject`,
      
      // Legacy endpoints (for backward compatibility)
      create: '/api/campaigns',
      update: (id: string) => `/api/campaigns/${id}`,
      applications: (id: string) => `/api/campaigns/${id}/applications`,
      myApplications: '/api/campaigns/applications/my',
    },
    
    // Notification endpoints
    notifications: {
      list: '/api/notifications',
      markAsRead: (id: string) => `/api/notifications/${id}/read`,
      markAllAsRead: '/api/notifications/read-all',
    },
  },
} as const;

export type Config = typeof config;
export default config;
