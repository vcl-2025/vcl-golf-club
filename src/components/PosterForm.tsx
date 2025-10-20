import { useState, useEffect } from 'react'
import { X, Calendar, FileText, Image as ImageIcon, Upload, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Poster {
  id: string
  title: string
  description: string
  image_url: string
  display_order: number
  event_date: string
  status: string
  created_at: string
}

interface PosterFormProps {
  poster?: Poster | null
  onClose: () => void
  onSuccess: () => void
}

export default function PosterForm({ poster, onClose, onSuccess }: PosterFormProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    display_order: 0,
    event_date: '',
    status: 'active'
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  useEffect(() => {
    if (poster) {
      setFormData({
        title: poster.title,
        description: poster.description,
        image_url: poster.image_url,
        display_order: poster.display_order,
        event_date: new Date(poster.event_date).toISOString().slice(0, 10),
        status: poster.status
      })
      setImagePreview(poster.image_url)
    }
  }, [poster])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage('请选择图片文件')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage('图片大小不能超过 5MB')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `posters/${fileName}` // 存储到 posters 文件夹

    const { error: uploadError } = await supabase.storage
      .from('golf-club-images')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('golf-club-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      let imageUrl = formData.image_url

      if (imageFile) {
        setUploading(true)
        imageUrl = await uploadImage(imageFile)
        setUploading(false)
      }

      if (!imageUrl) {
        throw new Error('请上传海报图片')
      }

      const posterData = {
        ...formData,
        image_url: imageUrl,
        event_date: new Date(formData.event_date).toISOString()
      }

      if (poster) {
        const { error } = await supabase
          .from('posters')
          .update(posterData)
          .eq('id', poster.id)

        if (error) throw error
        setMessage('海报更新成功！')
      } else {
        const { error } = await supabase
          .from('posters')
          .insert(posterData)

        if (error) throw error
        setMessage('海报创建成功！')
      }

      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error: any) {
      setMessage(error.message || '操作失败，请重试')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {poster ? '编辑海报' : '添加海报'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 海报标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                海报标题 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field"
                placeholder="请输入海报标题"
                required
              />
            </div>

            {/* 活动日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                活动日期 *
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="input-field"
                required
              />
            </div>

            {/* 活动介绍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                活动介绍
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                rows={4}
                placeholder="请输入活动介绍..."
              />
            </div>

            {/* 海报图片上传 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="w-4 h-4 inline mr-2" />
                海报图片 *
              </label>

              {/* 上传区域 */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="poster-form-image-upload"
                />
                <label htmlFor="poster-form-image-upload" className="cursor-pointer block">
                  {imagePreview ? (
                    <div>
                      <img
                        src={imagePreview}
                        alt="海报预览"
                        className="max-w-full max-h-48 mx-auto mb-2 rounded-lg"
                      />
                      <p className="text-sm text-gray-600">点击更换海报</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">点击上传海报图片</p>
                      <p className="text-xs text-gray-500">支持 JPG、PNG、GIF 格式，最大 5MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* 显示排序 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  显示排序
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="input-field"
                    placeholder="0"
                  />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, display_order: formData.display_order + 1 })}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, display_order: Math.max(0, formData.display_order - 1) })}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  数字越小越靠前显示
                </p>
              </div>

              {/* 状态 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  显示状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="active">显示</option>
                  <option value="hidden">隐藏</option>
                </select>
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

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
              >
                {uploading ? '上传中...' : loading ? '保存中...' : (poster ? '更新海报' : '创建海报')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
