-- V1.4: Add scrap_dc column to nscrap table
ALTER TABLE nscrap ADD COLUMN IF NOT EXISTS scrap_dc VARCHAR(2000);
