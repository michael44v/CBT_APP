<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../db.php';

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$db->query("CREATE TABLE IF NOT EXISTS `software_updates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(50) NOT NULL,
  `firmware` VARCHAR(100) NOT NULL,
  `improvements` TEXT NOT NULL,
  `size` VARCHAR(50) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if ($method === 'GET') {
    $res = $db->query("SELECT * FROM software_updates ORDER BY id DESC");
    $updates = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "updates" => $updates]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? '');

    if ($action === 'create') {
        $version = trim($data['version'] ?? '');
        $firmware = trim($data['firmware'] ?? '');
        $improvements = trim($data['improvements'] ?? '');
        $size = trim($data['size'] ?? '');
        $url = trim($data['url'] ?? '');

        if (empty($version) || empty($firmware) || empty($improvements) || empty($url)) {
            echo json_encode(["success" => false, "message" => "Fields: version, firmware, improvements, and url are required."]);
            exit();
        }

        $stmt = $db->prepare("INSERT INTO software_updates (version, firmware, improvements, size, url) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $version, $firmware, $improvements, $size, $url);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Software update added successfully."]);
        exit();
    }

    if ($action === 'delete') {
        $id = intval($data['id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM software_updates WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Software update deleted successfully."]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
