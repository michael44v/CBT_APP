-- CBT Application Database Audit Migration Script
-- Version: 1.1.0
-- Purpose: Upgrade central MySQL/MariaDB database schema to support incremental sync,
-- version/revision tracking, tombstone deletions, and query performance optimizations.

START TRANSACTION;

-- 1. Create global sync sequence tracking table
CREATE TABLE IF NOT EXISTS `sync_sequence` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `current_version` bigint(20) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `sync_sequence` (`id`, `current_version`) VALUES (1, 1)
ON DUPLICATE KEY UPDATE `id`=`id`;

-- 2. Create tombstone tracking table for deleted questions
CREATE TABLE IF NOT EXISTS `deleted_questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) NOT NULL,
  `sync_version` bigint(20) NOT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_deleted_questions_sync` (`sync_version`),
  KEY `idx_deleted_questions_qid` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add sync_version to subjects table
SET @exist_subjects := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'subjects' AND column_name = 'sync_version');
SET @query_subjects := IF(@exist_subjects = 0, 'ALTER TABLE subjects ADD COLUMN sync_version bigint(20) NOT NULL DEFAULT 1, ADD INDEX idx_subjects_sync_version (sync_version)', 'SELECT 1');
PREPARE stmt FROM @query_subjects;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Add sync_version to topics table
SET @exist_topics := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'topics' AND column_name = 'sync_version');
SET @query_topics := IF(@exist_topics = 0, 'ALTER TABLE topics ADD COLUMN sync_version bigint(20) NOT NULL DEFAULT 1, ADD INDEX idx_topics_sync_version (sync_version)', 'SELECT 1');
PREPARE stmt FROM @query_topics;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Add sync_version and performance indexes to questions table
SET @exist_questions := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'questions' AND column_name = 'sync_version');
SET @query_questions := IF(@exist_questions = 0, 'ALTER TABLE questions ADD COLUMN sync_version bigint(20) NOT NULL DEFAULT 1, ADD INDEX idx_questions_sync_version (sync_version)', 'SELECT 1');
PREPARE stmt FROM @query_questions;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Add duplicate check index on questions
SET @exist_dup_idx := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'questions' AND index_name = 'idx_questions_dup_check');
SET @query_dup_idx := IF(@exist_dup_idx = 0, 'ALTER TABLE questions ADD INDEX idx_questions_dup_check (subject_id, question_text(255))', 'SELECT 1');
PREPARE stmt FROM @query_dup_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;
