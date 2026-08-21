<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$db = getDbConnection();

$db->query("CREATE TABLE IF NOT EXISTS `software_updates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(50) NOT NULL,
  `firmware` VARCHAR(100) NOT NULL,
  `improvements` TEXT NOT NULL,
  `size` VARCHAR(50) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$res = $db->query("SELECT * FROM software_updates ORDER BY id DESC");
$updates = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

echo json_encode(["success" => true, "updates" => $updates]);
exit();
