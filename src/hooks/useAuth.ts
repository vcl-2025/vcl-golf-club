import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseAvailable, safeSupabaseOperation } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Check if Supabase is available
    if (!isSupabaseAvailable() || !supabase) {
      console.warn('Supabase is not available. Authentication features will be disabled.')
      if (mounted) {
        setUser(null)
        setLoading(false)
      }
      return
    }

    // 获取当前用户
    const getUser = async () => {
      const result = await safeSupabaseOperation(
        async () => {
          const { data: { user } } = await supabase!.auth.getUser()
          return user
        },
        null
      )

      if (mounted) {
        setUser(result)
        setLoading(false)
      }
    }

    getUser()

    // 监听认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
          
          // 检查是否是密码重置登录
          if (event === 'SIGNED_IN' && session?.user) {
            // 检查用户是否刚通过密码重置登录
            const isPasswordRecovery = session.user.app_metadata?.provider === 'email' && 
                                     session.user.aud === 'authenticated'
            if (isPasswordRecovery) {
              console.log('Password recovery login detected')
              localStorage.setItem('forcePasswordChange', 'true')
            }
          }
        }
      }
    )

    return () => {
      mounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    return await safeSupabaseOperation(
      async () => {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        return data
      },
      null
    )
  }

  const signOut = async () => {
    return await safeSupabaseOperation(
      async () => {
        const { error } = await supabase!.auth.signOut()
        if (error) throw error
        return true
      },
      true
    )
  }

  const signUp = async (email: string, password: string) => {
    return await safeSupabaseOperation(
      async () => {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        return data
      },
      null
    )
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    signUp,
    isAvailable: isSupabaseAvailable()
  }
}