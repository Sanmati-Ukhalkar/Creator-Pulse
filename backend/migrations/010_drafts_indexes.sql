-- Add index for optimizing Drafts page load specifically when filtering/loading user drafts.
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON drafts(user_id, status);
