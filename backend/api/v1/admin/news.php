<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../db.php';

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
        $thumbnail_url = trim($data['thumbnail_url'] ?? '');
        $published_at = trim($data['published_at'] ?? '');

        if (empty($published_at)) {
            $published_at = date('Y-m-d H:i:s');
        } else {
            $ts = strtotime($published_at);
            if ($ts !== false) {
                $published_at = date('Y-m-d H:i:s', $ts);
            } else {
                $published_at = date('Y-m-d H:i:s');
            }
        }

        if (empty($title) || empty($content)) {
            echo json_encode(["success" => false, "message" => "Fields: title and content are required."]);
            exit();
        }

        $stmt = $db->prepare("INSERT INTO news (title, content, icon_name, thumbnail_url, published_at) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $title, $content, $icon_name, $thumbnail_url, $published_at);
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
