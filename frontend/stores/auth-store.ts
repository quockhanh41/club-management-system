"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authService, setToken, removeToken, type User } from "@/services"
import { getUserClubRoles } from "@/lib/api"
import { getToken } from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitialized: boolean // New field to track if auth state has been loaded
  error: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<boolean>
  loadUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,
      error: null,

       login: async (email: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.login({ email, password, rememberMe })

          if (response.success) {
            const { user, accessToken } = response.data

            // Store token in localStorage
            setToken(accessToken)

            set({
              user,
              token: accessToken,
              isLoading: false,
              isInitialized: true,
              error: null,
            })

            // Gọi loadUser để lấy club_roles
            await get().loadUser();

              // Expose global flags for E2E and optionally redirect
              if (typeof window !== 'undefined') {
                ;(window as any).__AUTH_READY__ = true
                ;(window as any).__AUTH_SUCCESS__ = true
                ;(window as any).__AUTH_USER__ = user
                // Ensure redirect to home even if page component doesn't do it
                if (window.location.pathname !== '/') {
                  window.location.assign('/')
                }
              }

            return true
          } else {
            set({
              isLoading: false,
              isInitialized: true,
              error: response.message || "Login failed",
            })
             if (typeof window !== 'undefined') {
               ;(window as any).__AUTH_READY__ = true
               ;(window as any).__AUTH_SUCCESS__ = false
             }
            return false
          }
        } catch (error: any) {
          set({
            isLoading: false,
            isInitialized: true,
            error: error.message || "Login failed",
          })
           if (typeof window !== 'undefined') {
             ;(window as any).__AUTH_READY__ = true
             ;(window as any).__AUTH_SUCCESS__ = false
           }
          return false
        }
      },

      signup: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const response = await authService.register({
            full_name: name, // Theo API documentation
            email,
            password,
          })

          if (response.success) {
            // Registration thành công - không tự động login
            // User cần verify email trước
            set({
              isLoading: false,
              error: null,
            })
            return true
          } else {
            set({
              isLoading: false,
              error: response.message || "Registration failed",
            })
            return false
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Registration failed",
          })
          return false
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          // Call logout API
          await authService.logout()
        } catch (error) {
          console.warn("Logout API call failed:", error)
        } finally {
          // Always clear local state
          removeToken()
          set({
            user: null,
            token: null,
            isLoading: false,
            isInitialized: true,
            error: null,
          })
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null })

        try {
          // Sử dụng authService.updateProfile để gọi API
          const response = await authService.updateProfile(data)
          
          if (response.success) {
            // Cập nhật user state với dữ liệu mới từ server
            const currentUser = get().user
            if (currentUser) {
              const updatedUser = { ...currentUser, ...response.data }
              set({
                user: updatedUser,
                isLoading: false,
                error: null,
              })
              return true
            } else {
              // Nếu không có currentUser, vẫn reset loading
              set({
                isLoading: false,
                error: "No user to update",
              })
              return false
            }
          }

          set({
            isLoading: false,
            error: response.message || "Update failed",
          })
          return false
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Update failed",
          })
          return false
        }
      },

      loadUser: async () => {
        const token = getToken();
        if (!token) {
          set({ 
            user: null,
            token: null,
            isLoading: false,
            isInitialized: true,
            error: null 
          });
          return;
        }

        set({ isLoading: true, error: null })

        try {
          const profileResponse = await authService.getProfile();
          const userId = profileResponse?.data?.id;
          let clubRolesResponse = { success: false, data: [] };
          try {
            clubRolesResponse = await getUserClubRoles(userId);
          } catch (err) {
            // Nếu lỗi club-roles thì chỉ log, không logout
            console.warn('Failed to load club roles:', err);
          }

          if (profileResponse.success) {
            const user = {
              ...profileResponse.data,
              club_roles: Array.isArray(clubRolesResponse.data) ? clubRolesResponse.data : [],
            }

            set({
              user,
              token,  // Store actual token instead of "existing"
              isLoading: false,
              isInitialized: true,
              error: null,
            })
          } else {
            // Token might be invalid, clear it
            removeToken()
            set({
              user: null,
              token: null,
              isLoading: false,
              isInitialized: true,
              error: null,
            })
          }
        } catch (error: any) {
          // Token might be invalid, clear it
          removeToken()
          set({
            user: null,
            token: null,
            isLoading: false,
            isInitialized: true,
            error: null,
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
)

// E2E helpers (no-op in SSR). Allow tests to drive store deterministically when needed.
if (typeof window !== 'undefined') {
  try {
    (window as any).__AUTH_E2E_SET__ = (user: any, token: string) => {
      const { setState } = (useAuthStore as any);
      if (setState) {
        setState({ user, token, isInitialized: true, isLoading: false, error: null });
      }
    };
    (window as any).__AUTH_E2E_LOAD__ = async () => {
      try {
        await useAuthStore.getState().loadUser();
      } catch (e) {
        // ignore
      }
    };
  } catch (e) {
    // ignore
  }
}
