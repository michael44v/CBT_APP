-- instruction_migration.sql
-- Migration for Instructions, Passcode Promo Tracking, and Promo Code Usage Logging

ALTER TABLE `passcodes` ADD COLUMN IF NOT EXISTS `promo_code` VARCHAR(50) DEFAULT NULL AFTER `allowed_subjects`;
ALTER TABLE `passcodes` ADD COLUMN IF NOT EXISTS `amount_paid` DECIMAL(10,2) DEFAULT 0.00 AFTER `max_devices`;

CREATE TABLE IF NOT EXISTS `promo_code_usages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `promo_id` INT DEFAULT NULL,
  `promo_code` VARCHAR(50) NOT NULL,
  `user_email` VARCHAR(100) NOT NULL,
  `user_name` VARCHAR(100) DEFAULT NULL,
  `passcode` VARCHAR(50) DEFAULT NULL,
  `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
  `used_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_promo_code` (`promo_code`),
  KEY `idx_user_email` (`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default instructions into pricing_settings if not already present
INSERT INTO `pricing_settings` (`setting_key`, `setting_value`, `description`)
VALUES
('exam_instructions', 0, 'Read all questions carefully before choosing your answer.\nEnsure you manage your time effectively.\nClick Submit when you are finished.'),
('study_instructions', 0, 'Study mode allows you to practice at your own pace.\nDetailed explanations are available for every question.\nClick STUDY THIS QUESTION to reveal answers.')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
