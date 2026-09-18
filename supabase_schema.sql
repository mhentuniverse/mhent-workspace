-- ==============================================================================
-- 🪐 MHENT WORKSPACE - SUPABASE DATABASE SCHEMA & FULL TABLES (V2.0)
-- Dán và chạy toàn bộ mã này tại: Supabase Dashboard > SQL Editor > New Query
-- Project: https://supabase.com/dashboard/project/ctzkgchjheirxwejctvl/sql
-- ==============================================================================

-- 1. BẢNG QUẢN LÝ KHÔNG GIAN LÀM VIỆC (Workspaces)
CREATE TABLE IF NOT EXISTS public.workspaces (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'planet',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG THÀNH VIÊN THAM GIA KHÔNG GIAN (Workspace Members)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id BIGSERIAL PRIMARY KEY,
    workspace_code TEXT REFERENCES public.workspaces(code) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT DEFAULT '',
    user_email TEXT DEFAULT '',
    avatar TEXT DEFAULT '👤',
    status TEXT DEFAULT 'offline',
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'master')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_code, user_id)
);

ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '';
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '';
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '👤';
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- 3. BẢNG NHIỆM VỤ KANBAN (Tasks)
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_code TEXT DEFAULT 'MHENT-CORE-2026',
    title TEXT NOT NULL,
    "desc" TEXT DEFAULT '',
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    assignee TEXT DEFAULT '',
    deadline TEXT DEFAULT '',
    remark TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG TIN NHẮN CÁC KÊNH CHAT (Messages)
CREATE TABLE IF NOT EXISTS public.workspace_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_code TEXT DEFAULT 'MHENT-CORE-2026',
    channel TEXT DEFAULT 'general',
    sender TEXT NOT NULL,
    avt TEXT DEFAULT '👤',
    text TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG HÒM THƯ ĐIỆN TỬ NỘI BỘ (Mails)
CREATE TABLE IF NOT EXISTS public.workspace_mails (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_code TEXT DEFAULT 'MHENT-CORE-2026',
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    to_email TEXT DEFAULT '',
    subject TEXT NOT NULL,
    body TEXT DEFAULT '',
    starred BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG TÀI LIỆU MEDIA DRIVE (Files)
CREATE TABLE IF NOT EXISTS public.workspace_files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_code TEXT DEFAULT 'MHENT-CORE-2026',
    name TEXT NOT NULL,
    size TEXT DEFAULT '1.0 MB',
    type TEXT DEFAULT 'doc',
    icon TEXT DEFAULT '📄',
    url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BẢNG GHI CHÚ NHANH & WIKI (Notes)
CREATE TABLE IF NOT EXISTS public.workspace_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- BẬT ROW LEVEL SECURITY (RLS) & CẤP QUYỀN ĐỌC / GHI TỰ DO CHO CÁC BẢNG
-- ==============================================================================

-- Workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write workspaces" ON public.workspaces;
CREATE POLICY "Allow public read/write workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

-- Workspace Members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write workspace_members" ON public.workspace_members;
CREATE POLICY "Allow public read/write workspace_members" ON public.workspace_members FOR ALL USING (true) WITH CHECK (true);

-- Tasks
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write tasks" ON public.workspace_tasks;
CREATE POLICY "Allow public read/write tasks" ON public.workspace_tasks FOR ALL USING (true) WITH CHECK (true);

-- Messages
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write messages" ON public.workspace_messages;
CREATE POLICY "Allow public read/write messages" ON public.workspace_messages FOR ALL USING (true) WITH CHECK (true);

-- Mails
ALTER TABLE public.workspace_mails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write mails" ON public.workspace_mails;
CREATE POLICY "Allow public read/write mails" ON public.workspace_mails FOR ALL USING (true) WITH CHECK (true);

-- Files
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write files" ON public.workspace_files;
CREATE POLICY "Allow public read/write files" ON public.workspace_files FOR ALL USING (true) WITH CHECK (true);

-- Notes
ALTER TABLE public.workspace_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read/write notes" ON public.workspace_notes;
CREATE POLICY "Allow public read/write notes" ON public.workspace_notes FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- BẬT SUPABASE REALTIME REPLICATION (Lắng nghe thời gian thực)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_mails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_notes;
