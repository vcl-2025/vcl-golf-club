import React, { useState } from 'react'
import { X, Heart, DollarSign, Calendar, Users, Upload, TrendingUp } from 'lucide-react'
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

interface InvestmentDetailProps {
  project: InvestmentProject
  onClose: () => void
  user: any
}

export default function InvestmentDetail({ project, onClose, user }: InvestmentDetailProps) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { showError, showSuccess } = useModal()

  const progress = Math.min((project.current_amount / project.target_amount) * 100, 100)
  const daysLeft = Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPaymentProof(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) {
      showError('请输入有效的投资金额')
      return
    }

    setLoading(true)
    try {
      let paymentProofUrl = null

      if (paymentProof) {
        const fileExt = paymentProof.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `investment-proofs/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('golf-club-images')
          .upload(`investments/${filePath}`, paymentProof)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('golf-club-images')
          .getPublicUrl(`investments/${filePath}`)

        paymentProofUrl = publicUrl
      }

      const { error } = await supabase
        .from('investments')
        .insert({
          project_id: project.id,
          user_id: user?.id,
          amount: parseFloat(amount),
          payment_proof: paymentProofUrl,
          notes: notes || null,
          status: 'pending'
        })

      if (error) throw error

      // 使用 success 提示
      showSuccess('感谢您的支持，我们会尽快确认您的投资。', '投资提交成功！')
      
      setAmount('')
      setNotes('')
      setPaymentProof(null)
      setPreviewUrl(null)
      onClose()
    } catch (error) {
      console.error('提交投资失败:', error)
      showError('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">投资支持</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-gray-900">{project.title}</h3>
              </div>
              <div className="w-14 h-14 bg-red-500 rounded-xl flex items-center justify-center ml-4 flex-shrink-0">
                <Heart className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投资金额 (CAD) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                min="1"
                step="0.01"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="请输入投资金额"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">支付方式</h4>

              {project.payment_qrcode_url && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">扫描二维码支付：</p>
                  <img
                    src={project.payment_qrcode_url}
                    alt="支付二维码"
                    className="w-48 h-48 object-contain border border-gray-200 rounded-lg"
                  />
                </div>
              )}

              {project.emt_email && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-700 mb-1">EMT 转账邮箱：</p>
                  <p className="font-mono text-green-600 font-semibold">{project.emt_email}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传支付凭证（可选）
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="payment-proof"
                />
                <label htmlFor="payment-proof" className="cursor-pointer">
                  {previewUrl ? (
                    <div>
                      <img
                        src={previewUrl}
                        alt="支付凭证预览"
                        className="max-w-full max-h-64 mx-auto mb-2 rounded-lg"
                      />
                      <p className="text-sm text-gray-600">点击更换图片</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-1">点击上传支付凭证（可选）</p>
                      <p className="text-sm text-gray-500">支持 JPG、PNG 格式</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注信息（可选）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="如有特殊说明，请在此填写"
              />
            </div>

            <div className="flex space-x-4">
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '提交中...' : '确认投资'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    </>
  )
}
