import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.9.6/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, title, message, url } = await req.json()
    console.log('📤 发送推送:', { user_id, title })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)

    if (error) throw error
    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ error: '未找到订阅' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = JSON.stringify({
      title, body: message,
      icon: '/icon-192x192.png',
      data: { url: url || '/' }
    })

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          let subscription = typeof sub.subscription === 'string' 
            ? JSON.parse(sub.subscription) : sub.subscription
          
          // 🔧 修复：标准化订阅对象格式
          subscription = normalizeSubscription(subscription)
          
          // 🔍 调试：打印订阅信息
          console.log('📋 订阅信息:', {
            endpoint: subscription.endpoint?.slice(0, 50),
            hasKeys: !!subscription.keys,
            p256dhLength: subscription.keys?.p256dh?.length,
            authLength: subscription.keys?.auth?.length
          })
          
          await sendPush(subscription, payload, vapidPrivateKey, vapidPublicKey, vapidSubject)
          console.log('✅ 成功')
          return { success: true }
        } catch (err: any) {
          console.error('❌ 失败:', err.message, err.stack)
          return { success: false, error: err.message }
        }
      })
    )

    const successCount = results.filter(r => r.success).length
    return new Response(JSON.stringify({
      success: successCount > 0,
      message: `成功: ${successCount}/${results.length}`,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('💥 错误:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// 🔧 标准化订阅对象格式（处理各种可能的存储格式）
function normalizeSubscription(sub: any) {
  // 如果是字符串，先解析
  if (typeof sub === 'string') {
    sub = JSON.parse(sub)
  }
  
  // 确保有 keys 对象
  if (!sub.keys || typeof sub.keys !== 'object') {
    throw new Error('订阅对象缺少 keys')
  }
  
  // 确保 keys 里的值是字符串（不是对象）
  const p256dh = typeof sub.keys.p256dh === 'string' 
    ? sub.keys.p256dh 
    : String(sub.keys.p256dh)
  
  const auth = typeof sub.keys.auth === 'string'
    ? sub.keys.auth
    : String(sub.keys.auth)
  
  return {
    endpoint: sub.endpoint,
    keys: { p256dh, auth }
  }
}

async function sendPush(
  subscription: any,
  payload: string,
  privateKey: string,
  publicKey: string,
  subject: string
) {
  // 生成 VAPID JWT
  const endpoint = new URL(subscription.endpoint)
  const audience = `${endpoint.protocol}//${endpoint.host}`
  
  // 🔧 从 web-push 格式的公钥和私钥构建完整 JWK
  const publicKeyBuffer = base64ToArrayBuffer(publicKey)
  const privateKeyBuffer = base64ToArrayBuffer(privateKey)
  
  // 公钥是 65 字节：0x04 + x(32字节) + y(32字节)
  const publicKeyBytes = new Uint8Array(publicKeyBuffer)
  const x = publicKeyBytes.slice(1, 33)  // 跳过第一个字节 0x04
  const y = publicKeyBytes.slice(33, 65)
  
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: arrayBufferToBase64Url(x),
    y: arrayBufferToBase64Url(y),
    d: arrayBufferToBase64Url(privateKeyBuffer),
  }
  
  const key = await jose.importJWK(jwk, 'ES256')
  
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(audience)
    .setExpirationTime('12h')
    .setSubject(subject)
    .sign(key)

  // 加密 payload
  const encrypted = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth
  )

  // 发送请求
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt}, k=${publicKey}`,
      'TTL': '86400',
    },
    body: encrypted,
  })

  if (!response.ok) {
    const responseText = await response.text()
    console.error('推送失败详情:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      endpoint: subscription.endpoint.substring(0, 50)
    })
    throw new Error(`Push 失败: ${response.status} - ${responseText || response.statusText}`)
  }
}

async function encryptPayload(payload: string, userPublicKey: string, userAuth: string) {
  // 生成本地密钥对
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const userPubKey = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(userPublicKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  const localPubKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPubKey },
    localKeyPair.privateKey,
    256
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const authBuffer = base64ToArrayBuffer(userAuth)

  // HKDF 派生密钥
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const prk = await hkdf(sharedSecret, authBuffer, authInfo, 32)
  
  const contextInfo = createInfo('aesgcm', base64ToArrayBuffer(userPublicKey), localPubKeyRaw)
  const ikm = await hkdf(prk, salt, contextInfo, 32)
  
  const key = await crypto.subtle.importKey('raw', ikm, 'AES-GCM', false, ['encrypt'])

  const nonceInfo = createInfo('nonce', base64ToArrayBuffer(userPublicKey), localPubKeyRaw)
  const nonce = await hkdf(prk, salt, nonceInfo, 12)

  // 加密
  const paddedPayload = new Uint8Array(new TextEncoder().encode(payload).length + 2)
  paddedPayload.set(new TextEncoder().encode(payload))
  paddedPayload[paddedPayload.length - 1] = 2

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce) },
    key,
    paddedPayload
  )

  // 组装: salt(16) + rs(4) + idlen(1) + publicKey(65) + ciphertext
  const result = new Uint8Array(16 + 4 + 1 + localPubKeyRaw.byteLength + ciphertext.byteLength)
  let offset = 0
  
  result.set(salt, offset)
  offset += 16
  
  new DataView(result.buffer).setUint32(offset, 4096, false)
  offset += 4
  
  result[offset++] = localPubKeyRaw.byteLength
  result.set(new Uint8Array(localPubKeyRaw), offset)
  offset += localPubKeyRaw.byteLength
  
  result.set(new Uint8Array(ciphertext), offset)
  
  return result
}

async function hkdf(ikm: ArrayBuffer, salt: ArrayBuffer, info: Uint8Array, len: number) {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const prk = await crypto.subtle.sign('HMAC', key, salt)
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  
  const infoAndOne = new Uint8Array(info.length + 1)
  infoAndOne.set(info)
  infoAndOne[info.length] = 1
  
  const okm = await crypto.subtle.sign('HMAC', prkKey, infoAndOne)
  return okm.slice(0, len)
}

function createInfo(type: string, clientPublicKey: ArrayBuffer, serverPublicKey: ArrayBuffer) {
  const prefix = new TextEncoder().encode(`Content-Encoding: ${type}\0P-256\0`)
  const result = new Uint8Array(prefix.length + 2 + clientPublicKey.byteLength + 2 + serverPublicKey.byteLength)
  
  let offset = 0
  result.set(prefix, offset)
  offset += prefix.length
  
  new DataView(result.buffer).setUint16(offset, clientPublicKey.byteLength, false)
  offset += 2
  result.set(new Uint8Array(clientPublicKey), offset)
  offset += clientPublicKey.byteLength
  
  new DataView(result.buffer).setUint16(offset, serverPublicKey.byteLength, false)
  offset += 2
  result.set(new Uint8Array(serverPublicKey), offset)
  
  return result
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // 处理 URL-safe base64 和标准 base64
  let b64 = base64.replace(/-/g, '+').replace(/_/g, '/')
  
  // 添加必要的 padding
  const padding = b64.length % 4
  if (padding > 0) {
    b64 += '='.repeat(4 - padding)
  }
  
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  } catch (e) {
    console.error('Base64 解码失败:', base64.substring(0, 20) + '...')
    throw new Error(`Failed to decode base64: ${e.message}`)
  }
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}