-- ==============================================================================
-- 🪐 MHENT WORKSPACE - SUPABASE DATABASE SCHEMA & TABLES
-- Dán và chạy đoạn mã này tại: Supabase Dashboard > SQL Editor > New Query
-- Project: https://supabase.com/dashboard/project/ctzkgchjheirxwejctvl/sql
-- ==============================================================================

-- 1. BẢNG NHIỆM VỤ KANBAN (Tasks)
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

-- 2. BẢNG TIN NHẮN CÁC KÊNH CHAT (Messages)
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

-- 3. BẢNG HÒM THƯ ĐIỆN TỬ NỘI BỘ (Mails)
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

-- 4. BẢNG TÀI LIỆU MEDIA DRIVE (Files)
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

-- 5. BẢNG GHI CHÚ NHANH & WIKI (Notes)
CREATE TABLE IF NOT EXISTS public.workspace_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- BẬT ROW LEVEL SECURITY (RLS) & CẤP QUYỀN ĐỌC / GHI CHO TOÀN BỘ BẢNG
-- ==============================================================================

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
-- BẬT SUPABASE REALTIME REPLICATION (Cho phép lắng nghe realtime thay đổi)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_mails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_notes;
