-- Migration script for adding formula, external_link, and image_url columns to questions table
ALTER TABLE questions ADD COLUMN formula TEXT NULL AFTER question_text;
ALTER TABLE questions ADD COLUMN external_link VARCHAR(500) NULL AFTER formula;
ALTER TABLE questions ADD COLUMN image_url VARCHAR(255) NULL AFTER external_link;
