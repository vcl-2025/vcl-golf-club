import React from 'react'
import { Navigate, useParams } from 'react-router-dom'

/** 本地开发无 Edge Middleware 时：/i/:id 由 SPA 接住并跳到正文页 */
export default function InformationShareBridge() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    return <Navigate to="/dashboard?view=information" replace />
  }
  return <Navigate to={`/information/${id}`} replace />
}
