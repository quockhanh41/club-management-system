"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  User,
  Mail,
  Phone,
  Users,
  Calendar,
  Settings,
  Eye,
  Trash2,
  Edit,
  QrCode,
  Download,
  ExternalLink,
  FileText,
  Heart,
} from "lucide-react"
import { useAuthStore } from "@/stores/auth-store"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { authService } from "@/services"
import { eventService } from "@/services/event.service"
import { clubService } from "@/services/club.service"
import { applicationService, Application } from "@/services/application.service"
import { ApplicationDetailDialog } from "@/components/application-detail-dialog"
import { EventQrModal } from "@/components/event-qr-modal"

// Replace mocks with live-loaded state

export default function ProfilePage() {
  const { user, isInitialized, updateProfile, isLoading, logout } = useAuthStore()
  const router = useRouter()
  const { toast } = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    profile_picture_url: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [editForm, setEditForm] = useState<any>({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [eventParticipation, setEventParticipation] = useState<any[]>([])
  const [joinedClubs, setJoinedClubs] = useState<any[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [applicationDetailOpen, setApplicationDetailOpen] = useState(false)
  const [favoriteEvents, setFavoriteEvents] = useState<any[]>([])
  const [pageLoading, setPageLoading] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Wait for auth state to be initialized before checking user
    if (!isInitialized) {
      return; // Still loading auth state, don't redirect yet
    }

    if (!user) {
      // Give some time for store rehydration from localStorage
      const checkAgain = setTimeout(() => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          router.push("/login");
        }
      }, 100);
      return () => clearTimeout(checkAgain);
    }

    // Set page loading to false once user data is loaded
    setIsPageLoading(false)

    // Initialize profile data when user is loaded
    setProfileData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      profile_picture_url: user.profile_picture_url || ''
    })

    // Initialize userData with user from auth store
    setUserData({
      ...user,
      join_date: user.createdAt || new Date().toISOString(),
      stats: {
        clubs_joined: user.club_roles?.length || 0,
        events_participated: 0,
        upcoming_rsvps: 0
      }
    })

    // Initialize editForm with user data
    setEditForm({
      name: user.full_name || '',
      phone: user.phone || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    // Load joined clubs and my events
    ;(async () => {
      try {
        // Joined clubs: normalize roles from auth store, no public fallback
        const roles = Array.isArray(user.club_roles) ? user.club_roles : []
        const normalized = roles.map((cr: any) => ({
          club_id: cr.club_id ?? cr.clubId ?? cr.club?.id ?? cr.club,
          name: cr.club_name ?? cr.clubName ?? cr.club?.name ?? String(cr.club_id ?? cr.clubId ?? ''),
          logo_url: cr.club_logo ?? cr.clubLogo ?? cr.club?.logo_url ?? cr.club?.logo,
          join_date: cr.joined_at ?? cr.joinedAt ?? user.createdAt,
          role: cr.role,
          status: 'active',
        })).filter((c: any) => !!c.club_id)
        setJoinedClubs(normalized)

        // My events
        const myEventsRes = await eventService.getMyEvents().catch(() => null)
        if (myEventsRes && myEventsRes.success && Array.isArray(myEventsRes.data)) {
          const items = myEventsRes.data.map((e: any) => {
            const start = new Date(e.start_date || e.startDate)
            return {
              event_id: e.id || e._id,
              title: e.title,
              date: start.toISOString().slice(0,10),
              time: start.toISOString().slice(11,16),
              club_name: e.club?.name || '',
              status: 'confirmed',
              qr_code: null,
              location: typeof e.location === 'string' ? e.location : (e.location?.address || ''),
            }
          })
          setEventParticipation(items)
        }

        // Favorite events
        const favRes = await eventService.getUserFavoriteEvents({ page: 1, limit: 20 }).catch(() => null)
        if (favRes && favRes.success && favRes.data?.events) {
          const favItems = favRes.data.events.map((e: any) => {
            const start = new Date(e.start_date || e.startDate)
            return {
              id: e.id || e._id,
              title: e.title,
              clubName: e.club_id?.name || e.club?.name || '',
              date: start.toISOString().slice(0,10),
              time: start.toISOString().slice(11,16),
            }
          })
          setFavoriteEvents(favItems)
        }

        // Load user applications
        setApplicationsLoading(true)
        try {
          const applicationsRes = await applicationService.getUserApplications(user.id, {
            page: 1,
            limit: 10
          })
          if (applicationsRes.success && applicationsRes.data?.applications) {
            setApplications(applicationsRes.data.applications)
          }
        } catch (error) {
          console.error('Failed to load applications:', error)
        } finally {
          setApplicationsLoading(false)
        }
      } catch {
        // noop
      } finally {
        // Đảm bảo page loading được set thành false sau khi load xong
        setIsPageLoading(false)
      }
      })()
    }, [user, isInitialized, router])



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const updateData: Partial<any> = {}
    
    if (editForm.name && editForm.name.trim().length >= 2) {
      updateData.full_name = editForm.name.trim()
    }
    
    if (
      editForm.phone &&
      editForm.phone.trim().length > 0 &&
      /^[\+]?[1-9][\d]{0,15}$/.test(editForm.phone.trim())
    ) {
      updateData.phone = editForm.phone.trim()
    }
    
    if (Object.keys(updateData).length > 0) {
      setIsSavingProfile(true)
      
      // Optimistic update - cập nhật UI ngay lập tức
      const originalUserData = { ...userData }
      setUserData((prev: any) => ({ ...prev, ...updateData }))
      
      // Hiển thị toast thành công ngay lập tức
      toast({
        title: "Đang cập nhật...",
        description: "Thông tin của bạn đang được cập nhật.",
      })
      
      // Gọi API trong background
      try {
        const success = await updateProfile(updateData)
        if (success) {
          // Cập nhật user data với dữ liệu mới từ store
          const updatedUser = useAuthStore.getState().user
          if (updatedUser) {
            setUserData((prev: any) => ({ ...prev, ...updatedUser }))
          }
          // Reset password fields after successful update
          setEditForm((prev: any) => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }))
          toast({
            title: "Cập nhật thành công",
            description: "Thông tin của bạn đã được cập nhật.",
          })
        } else {
          // Rollback nếu thất bại
          setUserData(originalUserData)
          toast({
            title: "Lỗi",
            description: "Không thể cập nhật thông tin.",
            variant: "destructive",
          })
        }
      } catch (error: any) {
        // Rollback nếu có lỗi
        setUserData(originalUserData)
        toast({
          title: "Lỗi",
          description: error.message || "Không thể cập nhật thông tin.",
          variant: "destructive",
        })
      } finally {
        setIsSavingProfile(false)
      }
    }

    // Handle password change
    if (
      editForm.currentPassword &&
      editForm.newPassword &&
      editForm.newPassword === editForm.confirmPassword
    ) {
      try {
        // Sử dụng authService.changePassword
        const passwordResponse = await authService.changePassword({
          currentPassword: editForm.currentPassword,
          newPassword: editForm.newPassword
        })
        
        if (passwordResponse.success) {
          toast({
            title: "Mật khẩu đã được thay đổi",
            description: "Mật khẩu của bạn đã được cập nhật thành công.",
          })
          // Reset password fields
          setEditForm((prev: any) => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }))
        } else {
          toast({
            title: "Lỗi",
            description: passwordResponse.message || "Không thể thay đổi mật khẩu.",
            variant: "destructive",
          })
        }
      } catch (error: any) {
        toast({
          title: "Lỗi",
          description: error.message || "Không thể thay đổi mật khẩu.",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpdateProfile = handleSubmit

  const handleAvatarUpload = async () => {
    if (!avatarFile) return
    setPageLoading(true)
    
    try {
      // Simulate avatar upload
      const url = URL.createObjectURL(avatarFile)
      setUserData((prev: any) => ({ ...prev, profile_picture_url: url }))
      setAvatarPreview(null)
      setAvatarFile(null)
      
      toast({
        title: "Avatar đã được cập nhật",
        description: "Ảnh đại diện của bạn đã được thay đổi.",
      })
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật avatar.",
        variant: "destructive",
      })
    }
    
    setPageLoading(false)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleDeleteAccount = async () => {
    // Simulate API call
    setTimeout(() => {
      logout()
      toast({
        title: "Tài khoản đã được xóa",
        description: "Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.",
      })
      router.push("/")
    }, 1000)
  }

  const getInitials = (name?: string) => {
    if (typeof name !== 'string') return 'U'
    const trimmed = name.trim()
    if (!trimmed) return 'U'
    const initials = trimmed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
    return (initials || 'U').toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'unsigned_avatar')
    const res = await fetch('https://api.cloudinary.com/v1_1/djupm4v0l/image/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error('Upload thất bại')
    return data.secure_url
  }

  const handleUploadAvatar = async () => {
    if (!avatarFile) return
    setPageLoading(true)
    try {
      const url = await uploadToCloudinary(avatarFile)
      await authService.updateProfilePicture({ profile_picture_url: url })
      setUserData((prev: any) => ({ ...prev, profile_picture_url: url }))
      setAvatarFile(null)
      setAvatarPreview(null)
      toast({ title: 'Cập nhật avatar thành công!' })
    } catch (err: any) {
      toast({ title: 'Lỗi upload avatar', description: err.message, variant: 'destructive' })
    } finally {
      setPageLoading(false)
    }
  }

  const handleWithdrawApplication = async (applicationId: string) => {
    try {
      const response = await applicationService.withdrawApplication(applicationId)
      if (response.success) {
        // Cập nhật danh sách applications
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: 'withdrawn' as const }
            : app
        ))
        toast({
          title: "Rút đơn thành công",
          description: "Đơn ứng tuyển của bạn đã được rút.",
        })
      } else {
        toast({
          title: "Lỗi",
          description: response.message || "Không thể rút đơn ứng tuyển.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể rút đơn ứng tuyển.",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return null
  }

  // Split clubs by role for rendering
  const managerClubs = (joinedClubs || []).filter((c: any) => c.role === 'club_manager')
  const memberClubs = (joinedClubs || []).filter((c: any) => c.role !== 'club_manager')

  // Chỉ hiển thị loading khi đang khởi tạo auth state hoặc đang load trang
  if (!isInitialized || isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="lg:col-span-3">
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin và hoạt động của bạn</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={avatarPreview || userData?.profile_picture_url || "/placeholder.svg"} alt={userData?.full_name || "User"} />
                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                      {getInitials(userData?.full_name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 bg-white rounded-full p-1 border shadow hover:bg-gray-100"
                    onClick={() => fileInputRef.current?.click()}
                    title="Đổi avatar"
                  >
                    <Edit className="h-5 w-5 text-blue-600" />
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>
                {avatarPreview && (
                  <div className="mt-2 flex flex-col items-center">
                    <img src={avatarPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border mb-2" />
                    <Button size="sm" onClick={handleUploadAvatar} disabled={isLoading}>
                      {isLoading ? 'Đang lưu...' : 'Lưu avatar'}
                    </Button>
                    <Button size="sm" variant="outline" className="ml-2" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} disabled={isLoading}>
                      Hủy
                    </Button>
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{userData?.full_name || "User"}</h2>
                <p className="text-gray-600 text-sm mb-4">{userData?.email || "No email"}</p>
                <Badge variant="secondary" className="mb-4">
                  Thành viên từ {formatDate(userData?.join_date || "")}
                </Badge>

                <Separator className="my-4" />

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Câu lạc bộ</span>
                    <span className="font-semibold">{userData?.stats?.clubs_joined || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sự kiện tham gia</span>
                    <span className="font-semibold">{userData?.stats?.events_participated || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sự kiện sắp tới</span>
                    <span className="font-semibold">{userData?.stats?.upcoming_rsvps || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="clubs">Câu lạc bộ</TabsTrigger>
                <TabsTrigger value="events">Sự kiện</TabsTrigger>
                <TabsTrigger value="settings">Cài đặt</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Thông tin cá nhân
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{userData?.email || "No email"}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Số điện thoại</p>
                          <p className="font-medium">{userData?.phone || "No phone"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sự kiện sắp tới</CardTitle>
                    <CardDescription>Các sự kiện bạn đã đăng ký trong thời gian tới • Click vào sự kiện để xem chi tiết</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {eventParticipation
                        .filter((event) => event.status === "confirmed" && new Date(event.date) > new Date())
                        .slice(0, 3)
                        .map((event) => (
                          <div
                            key={event.event_id}
                            className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                            onClick={() => router.push(`/events/${event.event_id}`)}
                          >
                            <div className="flex-1">
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-gray-600">{event.club_name}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(event.date)} • {event.time}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedEventId(event.event_id)
                                  setQrModalOpen(true)
                                }}
                                disabled={event.status !== "confirmed"}
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Code
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => router.push(`/events/${event.event_id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Chi tiết
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Application Status Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          Trạng thái đơn ứng tuyển
                        </CardTitle>
                        <CardDescription>Theo dõi các đơn ứng tuyển của bạn</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/profile/applications">
                          Xem tất cả
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {applicationsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-gray-200 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {applications.length === 0 ? (
                          <p className="text-sm text-gray-500">Bạn chưa có đơn ứng tuyển nào.</p>
                        ) : (
                          applications.map((application: Application) => (
                            <div
                              key={application.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium">{application.club?.name || 'Không xác định'}</h4>
                                <p className="text-sm text-gray-600">
                                  {application.campaign?.title || 'Ứng tuyển thành viên'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Nộp ngày {formatDate(application.submitted_at)}
                                </p>
                                {application.rejection_reason && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Lý do: {application.rejection_reason}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant={
                                    application.status === "pending"
                                      ? "secondary"
                                      : application.status === "active"
                                        ? "default"
                                        : application.status === "withdrawn"
                                          ? "outline"
                                          : "destructive"
                                  }
                                >
                                  {application.status === "pending"
                                    ? "Đang xử lý"
                                    : application.status === "active"
                                      ? "Được chấp nhận"
                                      : application.status === "withdrawn"
                                        ? "Đã rút"
                                        : "Bị từ chối"}
                                </Badge>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedApplicationId(application.id)
                                    setApplicationDetailOpen(true)
                                  }}
                                >
                                  Chi tiết
                                </Button>
                                {application.club?.id && (
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={`/clubs/${application.club.id}`}>Xem CLB</Link>
                                  </Button>
                                )}
                                {application.status === "pending" && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                                        Rút đơn
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Rút đơn ứng tuyển</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Bạn có chắc chắn muốn rút đơn ứng tuyển này? Hành động này không thể hoàn tác.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleWithdrawApplication(application.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Rút đơn
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Favourite Events Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Heart className="h-5 w-5 mr-2" />
                      Sự kiện yêu thích
                    </CardTitle>
                    <CardDescription>Các sự kiện bạn đã lưu</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {favoriteEvents.length === 0 ? (
                        <p className="text-sm text-gray-500">Bạn chưa lưu sự kiện yêu thích nào.</p>
                      ) : (
                        favoriteEvents.map((event: any) => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-gray-600">{event.clubName}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(event.date)} • {event.time}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">   
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/events/${event.id}`}>Chi tiết</Link>
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Clubs Tab */}
              <TabsContent value="clubs" className="space-y-6">
                {/* Managed Clubs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Câu lạc bộ bạn quản lý
                    </CardTitle>
                    <CardDescription>Danh sách các câu lạc bộ bạn là quản lý</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {managerClubs.length === 0 ? (
                      <p className="text-sm text-gray-500">Bạn chưa là quản lý của câu lạc bộ nào.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {managerClubs.map((club: any) => (
                          <div key={club.club_id} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={club.logo_url || "/placeholder.svg"} alt={club.name} />
                              <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium">{club.name}</h4>
                              <p className="text-sm text-gray-600">Tham gia: {formatDate(club.join_date)}</p>
                              <Badge variant="default" className="mt-1">Quản lý</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <a href={`/clubs/${club.club_id}`}>
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button size="sm" asChild>
                                <a href={`/clubs/${club.club_id}/manage`}>Quản lý</a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Member Clubs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Câu lạc bộ đã tham gia
                    </CardTitle>
                    <CardDescription>Danh sách các câu lạc bộ bạn là thành viên</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {memberClubs.length === 0 ? (
                      <p className="text-sm text-gray-500">Bạn chưa tham gia câu lạc bộ nào.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {memberClubs.map((club: any) => (
                          <div key={club.club_id} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={club.logo_url || "/placeholder.svg"} alt={club.name} />
                              <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium">{club.name}</h4>
                              <p className="text-sm text-gray-600">Tham gia: {formatDate(club.join_date)}</p>
                              <Badge variant="secondary" className="mt-1">Thành viên</Badge>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/clubs/${club.club_id}`}>
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Sự kiện đã tham gia
                    </CardTitle>
                    <CardDescription>Lịch sử và trạng thái tham gia sự kiện</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {eventParticipation.map((event) => (
                        <div key={event.event_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm text-gray-600">{event.club_name}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(event.date)} • {event.time} • {event.location}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={event.status === "confirmed" ? "default" : "secondary"}>
                              {event.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedEventId(event.event_id)
                                setQrModalOpen(true)
                              }}
                              disabled={event.status !== "confirmed"}
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              QR Code
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      Cài đặt tài khoản
                    </CardTitle>
                    <CardDescription>Chỉnh sửa thông tin cá nhân và bảo mật</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Họ và tên</Label>
                          <Input
                            id="name"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                            disabled={!isEditing || isSavingProfile}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Số điện thoại</Label>
                          <Input
                            id="phone"
                            value={editForm.phone || ''}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, phone: e.target.value }))}
                            disabled={!isEditing || isSavingProfile}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={userData?.email || "No email"} disabled className="bg-gray-50" />
                        <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                      </div>

                      {isEditing && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="font-medium">Đổi mật khẩu (tùy chọn)</h4>
                            <div>
                              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                              <Input
                                id="currentPassword"
                                type="password"
                                value={editForm.currentPassword || ''}
                                onChange={(e) => setEditForm((prev: any) => ({ ...prev, currentPassword: e.target.value }))}
                                disabled={isSavingProfile}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                                <Input
                                  id="newPassword"
                                  type="password"
                                  value={editForm.newPassword || ''}
                                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, newPassword: e.target.value }))}
                                  disabled={isSavingProfile}
                                />
                              </div>
                              <div>
                                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                                <Input
                                  id="confirmPassword"
                                  type="password"
                                  value={editForm.confirmPassword || ''}
                                  onChange={(e) =>
                                    setEditForm((prev: any) => ({ ...prev, confirmPassword: e.target.value }))
                                  }
                                  disabled={isSavingProfile}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between pt-4">
                        <div>
                          {isEditing ? (
                            <div className="space-x-2">
                                                          <Button onClick={handleUpdateProfile} disabled={isSavingProfile}>
                              {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                              <Button variant="outline" onClick={() => {
                                setIsEditing(false)
                                // Reset form to original values
                                setEditForm({
                                  name: userData?.full_name || '',
                                  phone: userData?.phone || '',
                                  currentPassword: '',
                                  newPassword: '',
                                  confirmPassword: ''
                                })
                              }} disabled={isSavingProfile}>
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <Button onClick={() => {
                              setIsEditing(true)
                              // Initialize form with current user data
                              setEditForm({
                                name: userData?.full_name || '',
                                phone: userData?.phone || '',
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: ''
                              })
                            }} disabled={isSavingProfile}>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </Button>
                          )}
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa tài khoản
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Hành động này không thể hoàn tác. Tài khoản và tất cả dữ liệu của bạn sẽ bị xóa vĩnh
                                viễn.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                                Xóa tài khoản
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Application Detail Dialog */}
      <ApplicationDetailDialog
        applicationId={selectedApplicationId}
        open={applicationDetailOpen}
        onOpenChange={setApplicationDetailOpen}
        onApplicationUpdated={(updatedApplication) => {
          setApplications(prev => 
            prev.map(app => 
              app.id === updatedApplication.id ? updatedApplication : app
            )
          )
        }}
      />

      {/* Event QR Modal */}
      {selectedEventId && (
        <EventQrModal
          eventId={selectedEventId}
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
        />
      )}
    </div>
  )
}
