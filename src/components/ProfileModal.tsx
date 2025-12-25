import React, { useState, useEffect, useRef } from 'react'
import { X, User, Mail, Phone, Calendar, Edit2, Save, Upload, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import NotificationManager from './NotificationManager'
// import OneSignalManager from './OneSignalManager'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: any
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showAvatarCrop, setShowAvatarCrop] = useState(false)
  const [cropPosition, setCropPosition] = useState({ x: 50, y: 50 }) // 裁剪位置
  const [cropScale, setCropScale] = useState(100) // 裁剪缩放
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false)
  const memberPhotoInputRef = useRef<HTMLInputElement>(null)

  
  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    full_name: '',
    real_name: '',
    phone: '',
    email: '',
    avatar_url: '',
    member_photo_url: '',
    handicap: '',
    bc_handicap: '',
    clothing_size_top: '',
    clothing_size_bottom: '',
    vancouver_residence: '',
    domestic_residence: '',
    main_club_membership: '',
    industry: '',
    golf_preferences: '',
    golf_motto: '',
    other_interests: ''
  })

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile()
    }
  }, [isOpen, user])

  const fetchUserProfile = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          real_name,
          phone,
          email,
          avatar_url,
          avatar_position_x,
          avatar_position_y,
          avatar_scale,
          handicap,
          bc_handicap,
          member_photo_url,
          clothing_size_top,
          clothing_size_bottom,
          vancouver_residence,
          domestic_residence,
          main_club_membership,
          industry,
          golf_preferences,
          golf_motto,
          other_interests,
          birthday
        `)
        .eq('id', user.id)
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        setUserProfile(data)
        setEditForm({
          full_name: data.full_name || '',
          real_name: data.real_name || '',
          phone: data.phone || '',
          email: data.email || '',
          avatar_url: data.avatar_url || '',
          handicap: data.handicap || '',
          bc_handicap: data.bc_handicap || '',
          member_photo_url: data.member_photo_url || '',
          clothing_size_top: data.clothing_size_top || '',
          clothing_size_bottom: data.clothing_size_bottom || '',
          vancouver_residence: data.vancouver_residence || '',
          domestic_residence: data.domestic_residence || '',
          main_club_membership: data.main_club_membership || '',
          industry: data.industry || '',
          golf_preferences: data.golf_preferences || '',
          golf_motto: data.golf_motto || '',
          other_interests: data.other_interests || ''
        })
      } else {
        // 如果没有用户资料，创建一个默认的
        const newProfile = {
          id: user.id,
          full_name: '',
          phone: '',
          membership_type: 'standard'
        }
        
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single()
        
        if (createError) throw createError
        
        setUserProfile(createdProfile)
        setEditForm({
          full_name: '',
          phone: '',
          membership_type: 'standard'
        })
      }
    } catch (error: any) {
      console.error('获取用户资料失败:', error)
      setMessage('获取用户资料失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !userProfile) return
    
    setLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editForm.full_name,
          real_name: editForm.real_name,
          phone: editForm.phone,
          email: editForm.email,
          avatar_url: editForm.avatar_url,
          handicap: editForm.handicap ? parseFloat(editForm.handicap) : null,
          bc_handicap: editForm.bc_handicap ? parseFloat(editForm.bc_handicap) : null,
          member_photo_url: editForm.member_photo_url,
          clothing_size_top: editForm.clothing_size_top,
          clothing_size_bottom: editForm.clothing_size_bottom,
          vancouver_residence: editForm.vancouver_residence,
          domestic_residence: editForm.domestic_residence,
          main_club_membership: editForm.main_club_membership,
          industry: editForm.industry,
          golf_preferences: editForm.golf_preferences,
          golf_motto: editForm.golf_motto,
          other_interests: editForm.other_interests
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // 更新本地状态
      setUserProfile({
        ...userProfile,
        ...editForm
      })
      
      setIsEditing(false)
      setMessage('个人信息更新成功！')
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      console.error('更新用户资料失败:', error)
      setMessage('更新失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setMessage('请选择图片文件')
      return
    }

    // 检查文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage('图片大小不能超过2MB')
      return
    }

    // 设置文件并显示裁剪界面
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setCropPosition({ x: 50, y: 50 })
    setCropScale(100)
    setShowAvatarCrop(true)
  }

  const handleCropConfirm = async () => {
    if (!selectedFile || !user) return

    setUploadingAvatar(true)
    try {
      // 上传到 Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('golf-club-images')
        .upload(`avatars/${filePath}`, selectedFile)

      if (uploadError) throw uploadError

      // 获取公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('golf-club-images')
        .getPublicUrl(`avatars/${filePath}`)

      // 更新用户资料，保存裁剪设置
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          avatar_url: publicUrl,
          avatar_position_x: cropPosition.x,
          avatar_position_y: cropPosition.y,
          avatar_scale: cropScale
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // 更新本地状态
      setUserProfile({ 
        ...userProfile, 
        avatar_url: publicUrl,
        avatar_position_x: cropPosition.x,
        avatar_position_y: cropPosition.y,
        avatar_scale: cropScale
      })
      setEditForm({ ...editForm, avatar_url: publicUrl })
      setShowAvatarCrop(false)
      setSelectedFile(null)
      setPreviewUrl('')
      setMessage('头像上传成功！')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      console.error('头像上传失败:', error)
      setMessage('头像上传失败: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleMemberPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setMessage('请选择图片文件')
      return
    }

    // 检查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('图片大小不能超过5MB')
      return
    }

    setUploadingMemberPhoto(true)
    try {
      // 上传到 Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-member-photo-${Date.now()}.${fileExt}`
      const filePath = `member-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('golf-club-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 获取公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('golf-club-images')
        .getPublicUrl(filePath)

      // 更新用户资料
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ member_photo_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // 更新本地状态
      setUserProfile({ 
        ...userProfile, 
        member_photo_url: publicUrl
      })
      setEditForm({ ...editForm, member_photo_url: publicUrl })
      setMessage('会员正式照片上传成功！')
      setTimeout(() => setMessage(''), 3000)
    } catch (error: any) {
      console.error('会员正式照片上传失败:', error)
      setMessage('照片上传失败: ' + error.message)
    } finally {
      setUploadingMemberPhoto(false)
    }
  }

  const handleCancel = () => {
    if (userProfile) {
      setEditForm({
        full_name: userProfile.full_name || '',
        real_name: userProfile.real_name || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        avatar_url: userProfile.avatar_url || '',
        handicap: userProfile.handicap || '',
        bc_handicap: userProfile.bc_handicap || '',
        member_photo_url: userProfile.member_photo_url || '',
        clothing_size_top: userProfile.clothing_size_top || '',
        clothing_size_bottom: userProfile.clothing_size_bottom || '',
        vancouver_residence: userProfile.vancouver_residence || '',
        domestic_residence: userProfile.domestic_residence || '',
        main_club_membership: userProfile.main_club_membership || '',
        industry: userProfile.industry || '',
        golf_preferences: userProfile.golf_preferences || '',
        golf_motto: userProfile.golf_motto || '',
        other_interests: userProfile.other_interests || ''
      })
    }
    setIsEditing(false)
    setMessage('')
  }


  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    if (!dateString) return '未知'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const getMembershipTypeText = (type: string) => {
    switch (type) {
      case 'premium': return '高级会员'
      case 'vip': return 'VIP会员'
      default: return '普通会员'
    }
  }

  const getMembershipTypeColor = (type: string) => {
    switch (type) {
      case 'premium': return 'text-blue-600 bg-blue-100'
      case 'vip': return 'text-purple-600 bg-purple-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  // 计算年龄
  const calculateAge = (birthday: string | null | undefined): number | null => {
    if (!birthday) return null
    try {
      const birthDate = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    } catch (error) {
      return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-[1080px] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">个人资料</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-golf-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">加载中...</p>
            </div>
          )}

          {!loading && userProfile && (
            <div className="space-y-6">
              {/* 头像和基本信息 */}
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6 p-6 bg-gradient-to-r from-golf-50 to-blue-50 rounded-xl border border-golf-100">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-[#F15B98] rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                    {userProfile.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt={userProfile.full_name}
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${userProfile.avatar_position_x || 50}% ${userProfile.avatar_position_y || 50}%`
                        }}
                      />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="w-8 h-8 bg-[#F15B98] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#F15B98]/80 transition-colors disabled:opacity-50"
                        title={userProfile.avatar_url ? "更换头像" : "上传头像"}
                      >
                        {uploadingAvatar ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1 w-full md:w-auto">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">
                    {userProfile.full_name || '未设置昵称'}
                    {(() => {
                      const age = calculateAge(userProfile.birthday)
                      return age !== null ? ` (${age}岁)` : ''
                    })()}
                  </h3>
                  <p className="text-gray-600 mb-3">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getMembershipTypeColor(userProfile.membership_type)}`}>
                      {getMembershipTypeText(userProfile.membership_type)}
                    </span>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>编辑资料</span>
                  </button>
                )}
              </div>

              {/* 详细信息 */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* 左侧：基本信息 */}
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-golf-600" />
                      基本信息
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-2" />
                          邮箱地址
                        </label>
                        <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border">
                          {user.email}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">邮箱地址无法修改</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          昵称
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                            placeholder="请输入您的昵称"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border">
                            {userProfile.full_name || '未设置'}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">这是您在俱乐部中显示的昵称</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          真实姓名
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.real_name}
                            onChange={(e) => setEditForm({ ...editForm, real_name: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                            placeholder="请输入您的真实姓名"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border">
                            {userProfile.real_name || '未设置'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-2" />
                          手机号码
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                            placeholder="请输入您的手机号码"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border">
                            {userProfile.phone || '未设置'}
                          </div>
                        )}
                      </div>

                      {/* 会员正式照片 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Camera className="w-4 h-4 inline mr-2" />
                          会员正式照片
                        </label>
                        {isEditing ? (
                          <div className="space-y-3">
                            {editForm.member_photo_url ? (
                              <div className="relative">
                                <img
                                  src={editForm.member_photo_url}
                                  alt="会员正式照片"
                                  className="w-full max-w-md h-48 object-contain border border-gray-300 rounded-lg bg-gray-50"
                                />
                                <button
                                  type="button"
                                  onClick={() => memberPhotoInputRef.current?.click()}
                                  disabled={uploadingMemberPhoto}
                                  className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                  {uploadingMemberPhoto ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                      上传中...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      更换照片
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('user_profiles')
                                        .update({ member_photo_url: null })
                                        .eq('id', user.id)
                                      
                                      if (error) throw error
                                      
                                      setEditForm({ ...editForm, member_photo_url: '' })
                                      setUserProfile({ ...userProfile, member_photo_url: '' })
                                      setMessage('照片已删除')
                                      setTimeout(() => setMessage(''), 3000)
                                    } catch (error: any) {
                                      console.error('删除照片失败:', error)
                                      setMessage('删除失败: ' + error.message)
                                    }
                                  }}
                                  className="mt-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  删除照片
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => memberPhotoInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors cursor-pointer h-48 flex items-center justify-center"
                              >
                                {uploadingMemberPhoto ? (
                                  <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-2" />
                                    <p className="text-gray-600">上传中...</p>
                                  </div>
                                ) : (
                                  <div>
                                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-600 mb-1">点击上传会员正式照片</p>
                                    <p className="text-sm text-gray-500">支持 JPG、PNG 格式，最大 5MB</p>
                                  </div>
                                )}
                              </div>
                            )}
                            <input
                              ref={memberPhotoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleMemberPhotoUpload}
                              className="hidden"
                            />
                          </div>
                        ) : (
                          <div>
                            {userProfile.member_photo_url ? (
                              <img
                                src={userProfile.member_photo_url}
                                alt="会员正式照片"
                                className="w-full max-w-md h-48 object-contain border border-gray-300 rounded-lg bg-gray-50"
                              />
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-lg text-gray-500 border">
                                未上传
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右侧：会员信息和其他信息 */}
                <div className="space-y-6">

                  {/* 高尔夫信息 */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🏌️</span>
                      高尔夫信息
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          差点
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="54"
                            value={editForm.handicap}
                            onChange={(e) => setEditForm({ ...editForm, handicap: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                            placeholder="18.5"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border">
                            {userProfile.handicap || '未设置'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          BC差点
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="54"
                            value={editForm.bc_handicap}
                            onChange={(e) => setEditForm({ ...editForm, bc_handicap: e.target.value })}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                            placeholder="18.5"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg text-gray-700 border">
                            {userProfile.bc_handicap || '未设置'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 其它信息 */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-golf-600" />
                      其它信息
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            上衣
                          </label>
                      {isEditing ? (
                        <select
                          value={editForm.clothing_size_top}
                          onChange={(e) => setEditForm({ ...editForm, clothing_size_top: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                        >
                          <option value="">请选择尺码</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                        </select>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          {userProfile.clothing_size_top || '未设置'}
                        </div>
                      )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            裤（裙）
                          </label>
                      {isEditing ? (
                        <select
                          value={editForm.clothing_size_bottom}
                          onChange={(e) => setEditForm({ ...editForm, clothing_size_bottom: e.target.value })}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                        >
                          <option value="">请选择尺码</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                        </select>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          {userProfile.clothing_size_bottom || '未设置'}
                        </div>
                      )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          行业
                        </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.industry}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                        placeholder="如：金融、科技、教育等"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {userProfile.industry || '未设置'}
                      </div>
                    )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          温哥华常驻地
                        </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.vancouver_residence}
                        onChange={(e) => setEditForm({ ...editForm, vancouver_residence: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                        placeholder="如：Richmond、Burnaby等"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {userProfile.vancouver_residence || '未设置'}
                      </div>
                    )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          国内常驻地
                        </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.domestic_residence}
                        onChange={(e) => setEditForm({ ...editForm, domestic_residence: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                        placeholder="如：北京、上海、深圳等"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {userProfile.domestic_residence || '未设置'}
                      </div>
                    )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          主球会会籍
                        </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.main_club_membership}
                        onChange={(e) => setEditForm({ ...editForm, main_club_membership: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                        placeholder="如：温哥华高尔夫俱乐部、列治文高尔夫俱乐部等"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        {userProfile.main_club_membership || '未设置'}
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 多行文本字段 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    打球喜好
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.golf_preferences}
                      onChange={(e) => setEditForm({ ...editForm, golf_preferences: e.target.value })}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                      placeholder="如：喜欢挑战性球场、偏好早场打球等"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {userProfile.golf_preferences || '未设置'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    高球座右铭
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.golf_motto}
                      onChange={(e) => setEditForm({ ...editForm, golf_motto: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                      placeholder="如：享受每一杆，追求完美"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {userProfile.golf_motto || '未设置'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    其他兴趣爱好
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.other_interests}
                      onChange={(e) => setEditForm({ ...editForm, other_interests: e.target.value })}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-golf-500 focus:border-transparent"
                      placeholder="如：网球、游泳、摄影、旅行等"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {userProfile.other_interests || '未设置'}
                    </div>
                  )}
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg text-sm ${
                  message.includes('成功') 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              {/* 通知设置 */}
        {false && !isEditing && (
          <div className="mt-6 space-y-4">
            <NotificationManager userId={user.id} />
            {/* <OneSignalManager /> */}
          </div>
        )}

              {/* 操作按钮 */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 btn-primary py-3 disabled:opacity-50 flex items-center justify-center"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? '保存中...' : '保存'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    关闭
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 头像裁剪预览 */}
      {showAvatarCrop && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">调整头像裁剪</h3>
            
            <div className="mb-4">
              <div className="relative w-32 h-32 mx-auto border-2 border-gray-300 rounded-full overflow-hidden">
                <img 
                  src={previewUrl} 
                  alt="头像预览"
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${cropPosition.x}% ${cropPosition.y}%`,
                    transform: `scale(${cropScale / 100})`
                  }}
                />
                <div 
                  className="absolute w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-lg"
                  style={{
                    left: `${cropPosition.x}%`,
                    top: `${cropPosition.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  水平位置: {cropPosition.x}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropPosition.x}
                  onChange={(e) => setCropPosition({ ...cropPosition, x: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  垂直位置: {cropPosition.y}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropPosition.y}
                  onChange={(e) => setCropPosition({ ...cropPosition, y: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  缩放大小: {cropScale}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={cropScale}
                  onChange={(e) => setCropScale(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAvatarCrop(false)
                  setSelectedFile(null)
                  setPreviewUrl('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={uploadingAvatar}
                className="px-4 py-2 bg-[#F15B98] text-white rounded-lg hover:bg-[#F15B98]/80 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}