import React, { useState } from 'react'

const PRESET_REASONS = [
  '报错活动了',
  '临时有事',
  '行程冲突',
  '改主意了',
] as const

const OTHER_KEY = '__other__'

interface Props {
  submitting: boolean
  onSubmit: (reason: string) => void
  onCancel: () => void
  submitLabel?: string
}

/**
 * 会员自助取消报名理由表单：
 * 4 个预设理由按钮，选「其他」后才显示手填输入框（必填）。
 */
export default function RegistrationCancelForm({
  submitting,
  onSubmit,
  onCancel,
  submitLabel = '确认取消',
}: Props) {
  const [selected, setSelected] = useState<string>('')
  const [custom, setCustom] = useState('')

  const isOther = selected === OTHER_KEY
  const trimmedCustom = custom.trim()
  const finalReason = isOther ? trimmedCustom : selected
  const canSubmit =
    !submitting &&
    (selected !== '' && (!isOther || trimmedCustom.length > 0))

  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
      <div className="text-sm font-medium text-red-700">
        请选择取消原因（必填）
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelected(r)}
            disabled={submitting}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selected === r
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {r}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected(OTHER_KEY)}
          disabled={submitting}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            isOther
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          其他
        </button>
      </div>

      {isOther && (
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="请输入取消原因"
          disabled={submitting}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60"
        />
      )}

      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => onSubmit(finalReason)}
          disabled={!canSubmit}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {submitting ? '处理中...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
        >
          返回
        </button>
      </div>
    </div>
  )
}
