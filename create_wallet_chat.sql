-- Create table for AI Financial Assistant Chat History
CREATE TABLE IF NOT EXISTS wallet_chat_messages (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE wallet_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access Wallet Chat" ON wallet_chat_messages;
CREATE POLICY "Public Access Wallet Chat" ON wallet_chat_messages FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE wallet_chat_messages;
