import React, { useState, useEffect } from 'react'
import { X, Upload, DollarSign, Calendar, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useModal } from './ModalProvider'

interface InvestmentProject {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  payment_method: string | null
  payment_qrcode_url: string | null
  emt_email: string | null
  status: string
  start_date: string
  end_date: string
}

interface InvestmentProjectFormProps {
  project?: InvestmentProject | null
  onClose: () => void
  onSuccess: () => void
}

export default function InvestmentProjectForm({ project, onClose, onSuccess }: InvestmentProjectFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_amount: '',
    current_amount: '',
    payment_method: 'both',
    emt_email: '',
    status: 'active',
    start_date: '',
    end_date: ''
  })
  const [qrcodeFile, setQrcodeFile] = useState<File | null>(null)
  const [qrcodePreview, setQrcodePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { showError } = useModal()

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title,
        description: project.description || '',
        target_amount: project.target_amount?.toString() || '0',
        current_amount: project.current_amount?.toString() || '0',
        payment_method: project.payment_method || 'both',
        emt_email: project.emt_email || '',
        status: project.status,
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
        end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : ''
      })
      if (project.payment_qrcode_url) {
        setQrcodePreview(project.payment_qrcode_url)
      }
    } else {
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, start_date: today }))
    }
  }, [project])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setQrcodeFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setQrcodePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let qrcodeUrl = project?.payment_qrcode_url || null

      if (qrcodeFile) {
        const fileExt = qrcodeFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `investment-qrcodes/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('golf-club-images')
          .upload(`investments/${filePath}`, qrcodeFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('golf-club-images')
          .getPublicUrl(`investments/${filePath}`)

        qrcodeUrl = publicUrl
      }

      const projectData = {
        title: formData.title,
        description: formData.description,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount),
        payment_method: formData.payment_method,
        payment_qrcode_url: qrcodeUrl,
        emt_email: formData.emt_email || null,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date
      }

      if (project) {
        const { error } = await supabase
          .from('investment_projects')
          .update(projectData)
          .eq('id', project.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('investment_projects')
          .insert(projectData)

        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('保存投资项目失败:', error)
      showError('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {project ? '编辑投资项目' : '创建投资项目'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="例如：球场扩建项目"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="详细描述投资项目的目的、用途等"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标金额 (CAD) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.target_amount}
                  onChange={(e) => {
                    const value = e.target.value
                    // 只允许数字和小数点
                    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                      setFormData({ ...formData, target_amount: value })
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="100000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                已筹集金额 (CAD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始日期 *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束日期 *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EMT 转账邮箱
              </label>
              <input
                type="email"
                value={formData.emt_email}
                onChange={(e) => setFormData({ ...formData, emt_email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支付二维码
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="qrcode-upload"
                />
                <label htmlFor="qrcode-upload" className="cursor-pointer">
                  {qrcodePreview ? (
                    <div>
                      <img
                        src={qrcodePreview}
                        alt="二维码预览"
                        className="max-w-xs max-h-48 mx-auto mb-2 rounded-lg"
                      />
                      <p className="text-sm text-gray-600">点击更换二维码</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">点击上传支付二维码</p>
                      <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目状态 *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : project ? '更新项目' : '创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
