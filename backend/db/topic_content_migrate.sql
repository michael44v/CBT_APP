-- Migration to add description and content columns to topics table
ALTER TABLE `topics`
  ADD COLUMN `description` TEXT NULL AFTER `name`,
  ADD COLUMN `content` LONGTEXT NULL AFTER `description`;
