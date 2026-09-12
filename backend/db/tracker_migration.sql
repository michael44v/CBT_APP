-- Database migration for Worker Management & Question Author Tracking

-- 1. Add created_by (admin_user_id) to questions table
SET @exist_q_created_by := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'questions' AND column_name = 'created_by');
SET @query_q_created_by := IF(@exist_q_created_by = 0, 'ALTER TABLE questions ADD COLUMN created_by int(11) DEFAULT NULL, ADD INDEX idx_questions_created_by (created_by)', 'SELECT 1');
PREPARE stmt FROM @query_q_created_by;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add full_name, plain_password, permissions, status columns to admin_users table
SET @exist_au_fullname := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'admin_users' AND column_name = 'full_name');
SET @query_au_fullname := IF(@exist_au_fullname = 0, 'ALTER TABLE admin_users ADD COLUMN full_name varchar(100) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @query_au_fullname;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_au_plainpass := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'admin_users' AND column_name = 'plain_password');
SET @query_au_plainpass := IF(@exist_au_plainpass = 0, 'ALTER TABLE admin_users ADD COLUMN plain_password varchar(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @query_au_plainpass;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_au_perms := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'admin_users' AND column_name = 'permissions');
SET @query_au_perms := IF(@exist_au_perms = 0, 'ALTER TABLE admin_users ADD COLUMN permissions text DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @query_au_perms;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_au_status := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'admin_users' AND column_name = 'status');
SET @query_au_status := IF(@exist_au_status = 0, "ALTER TABLE admin_users ADD COLUMN status varchar(20) DEFAULT 'active'", 'SELECT 1');
PREPARE stmt FROM @query_au_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
