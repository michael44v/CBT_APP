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
    $search = trim($_GET['search'] ?? '');
    if (!empty($search)) {
        $search_term = "%" . $search . "%";
        $stmt = $db->prepare("SELECT * FROM users WHERE name LIKE ? OR email LIKE ? OR school LIKE ? ORDER BY created_at DESC");
        $stmt->bind_param("sss", $search_term, $search_term, $search_term);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $db->query("SELECT * FROM users ORDER BY created_at DESC");
    }

    $users = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "users" => $users]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? '');
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Email parameter is required."]);
        exit();
    }

    if ($action === 'suspend' || $action === 'reactivate') {
        $status = ($action === 'suspend') ? 'suspended' : 'active';
        $stmt = $db->prepare("UPDATE passcodes SET status = ? WHERE email = ?");
        $stmt->bind_param("ss", $status, $email);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "User passcodes set to " . $status . " successfully."]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
