-- Migration Script: Fix Missing Column in NBBSMASTER
-- Issue: Main Page crash due to missing column expected by BoardMaster entity.
-- Created: 2026-01-02

-- Add missing column BBS_ATTRB_CODE
ALTER TABLE NBBSMASTER ADD COLUMN BBS_ATTRB_CODE VARCHAR(6) NULL;

-- Optional: Set default value for existing rows if needed (Uncomment if required)
-- UPDATE NBBSMASTER SET BBS_ATTRB_CODE = 'BBSA01' WHERE BBS_ATTRB_CODE IS NULL;

-- Optional: Add comment matching code based on observed patterns
COMMENT ON COLUMN NBBSMASTER.BBS_ATTRB_CODE IS '게시판속성코드';
