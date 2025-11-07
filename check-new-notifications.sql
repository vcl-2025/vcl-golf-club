-- 排查新通知看不到的问题

-- 1. 查看所有通知（包括草稿和已归档的）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  expires_at,
  created_at,
  updated_at,
  is_pinned,
  display_order,
  CASE 
    WHEN status != 'published' THEN '状态不是已发布'
    WHEN published_at IS NULL THEN '发布时间为空'
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN '已过期'
    ELSE '应该显示'
  END AS 问题说明
FROM information_items
ORDER BY created_at DESC
LIMIT 20;

-- 2. 查看所有已发布但可能看不到的通知
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  expires_at,
  is_pinned,
  display_order,
  created_at,
  CASE 
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN '已过期'
    WHEN published_at IS NULL THEN '发布时间为空'
    ELSE '正常'
  END AS 状态
FROM information_items
WHERE status = 'published'
ORDER BY 
  is_pinned DESC,
  display_order ASC,
  published_at DESC NULLS LAST;

-- 3. 查看最近创建的通知（检查状态）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  expires_at,
  created_at,
  updated_at
FROM information_items
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 4. 查看所有草稿状态的通知（这些不会显示）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  created_at
FROM information_items
WHERE status = 'draft'
ORDER BY created_at DESC;

-- 5. 查看所有已归档的通知（这些不会显示）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  created_at
FROM information_items
WHERE status = 'archived'
ORDER BY created_at DESC;

-- 6. 查看已发布但发布时间为空的（这些可能不显示）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  expires_at,
  created_at
FROM information_items
WHERE status = 'published' 
  AND published_at IS NULL
ORDER BY created_at DESC;

-- 7. 查看已发布但已过期的（这些不会显示）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  expires_at,
  created_at,
  expires_at < NOW() AS 是否已过期
FROM information_items
WHERE status = 'published'
  AND expires_at IS NOT NULL
  AND expires_at < NOW()
ORDER BY created_at DESC;

-- 8. 应该显示的通知（最终查询，模拟前端逻辑）
SELECT 
  id,
  title,
  category,
  status,
  published_at,
  expires_at,
  is_pinned,
  display_order,
  created_at
FROM information_items
WHERE status = 'published'
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY 
  is_pinned DESC,
  display_order ASC,
  published_at DESC NULLS LAST;

