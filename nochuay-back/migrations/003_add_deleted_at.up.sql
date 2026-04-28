ALTER TABLE pages
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_pages_user_deleted_at ON pages(user_id, deleted_at);
