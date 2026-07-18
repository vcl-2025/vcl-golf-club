/**
 * 从 user_profiles 导出 log-lottery 可用的人员 Excel
 * 表头：uid | name | avatar | department | identity
 *
 * 用法：node scripts/export-lottery-members.mjs
 * 输出：项目根目录 抽奖会员名单.xlsx
 */
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnv() {
  const env = {}
  try {
    const text = readFileSync(join(ROOT, '.env'), 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    /* ignore */
  }
  return env
}

function resolveCredentials(env) {
  const url =
    process.env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    'https://mypglmtsgfgojtnpmkbc.supabase.co'

  // 优先显式 service role；否则用 .env 的 anon（当前 RLS 允许读会员档案）
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY

  if (!key) throw new Error('缺少 Supabase key（请配置 .env 的 VITE_SUPABASE_ANON_KEY）')
  return { url, key }
}

const DEFAULT_AVATAR =
  process.env.LOTTERY_DEFAULT_AVATAR ||
  'https://vclgolfclub.ca/default-golfer-avatar.png'

const typeMap = {
  standard: '标准会员',
  premium: '高级会员',
  vip: 'VIP会员',
}

const roleMap = {
  admin: '管理员',
  finance: '财务',
  editor: '编辑',
  score_manager: '成绩管理员',
  viewer: '访客',
  member: '会员',
}

const env = loadEnv()
const { url, key } = resolveCredentials(env)
const supabase = createClient(url, key)

const { data: profiles, error } = await supabase
  .from('user_profiles')
  .select('id, full_name, real_name, avatar_url, member_photo_url, membership_type, role, is_active')
  .eq('is_active', true)
  .order('full_name', { ascending: true })

if (error) {
  console.error('查询失败:', error.message)
  process.exit(1)
}

const rows = []
let withAvatar = 0
let withDefault = 0
let skipped = 0

for (const p of profiles) {
  const name = (p.real_name || p.full_name || '').trim()
  if (!name) {
    skipped++
    continue
  }
  const ownUrl =
    (p.avatar_url && String(p.avatar_url).trim()) ||
    (p.member_photo_url && String(p.member_photo_url).trim()) ||
    ''
  const hasOwn = !!ownUrl
  if (hasOwn) withAvatar++
  else withDefault++

  rows.push({
    uid: p.id,
    name,
    avatar: hasOwn ? ownUrl : DEFAULT_AVATAR,
    department: typeMap[p.membership_type] || p.membership_type || '会员',
    identity: roleMap[p.role] || roleMap.member,
  })
}

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(rows, {
  header: ['uid', 'name', 'avatar', 'department', 'identity'],
})
ws['!cols'] = [
  { wch: 38 },
  { wch: 16 },
  { wch: 90 },
  { wch: 12 },
  { wch: 12 },
]
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

const out = join(ROOT, '抽奖会员名单.xlsx')
writeFileSync(out, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

console.log(`已导出 ${rows.length} 人 → ${out}`)
console.log(`自有头像 ${withAvatar}，默认头像 ${withDefault}，跳过无姓名 ${skipped}`)
console.log('导入：抽奖页 → 人员配置 → 上传 Excel（中文模板列：uid/name/avatar/department/identity）')
