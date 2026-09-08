-- Migration script for adding formula and external_link columns to questions table
ALTER TABLE questions ADD COLUMN formula TEXT NULL AFTER question_text;
ALTER TABLE questions ADD COLUMN external_link VARCHAR(500) NULL AFTER formula;
