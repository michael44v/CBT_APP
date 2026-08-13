<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../db/db.php';

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $res = $db->query("SELECT * FROM news ORDER BY created_at DESC");
    $news = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "news" => $news]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? '');

    if ($action === 'create') {
        $title = trim($data['title'] ?? '');
        $content = trim($data['content'] ?? '');
        $icon_name = trim($data['icon_name'] ?? 'newspaper');

        if (empty($title) || empty($content)) {
            echo json_encode(["success" => false, "message" => "Fields: title and content are required."]);
            exit();
        }

        $stmt = $db->prepare("INSERT INTO news (title, content, icon_name) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $title, $content, $icon_name);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "News article posted successfully."]);
        exit();
    }

    if ($action === 'delete') {
        $id = intval($data['id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM news WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "News article deleted successfully."]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
