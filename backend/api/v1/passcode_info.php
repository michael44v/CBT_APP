<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../db/db.php';

$data = json_decode(file_get_contents("php://input"), true) ?: $_REQUEST;
$passcode_val = trim($data['passcode'] ?? '');

if (empty($passcode_val)) {
    echo json_encode(["success" => false, "message" => "Passcode is required."]);
    exit();
}

$db = getDbConnection();

$stmt = $db->prepare("SELECT p.*, o.name as organization_name FROM passcodes p LEFT JOIN organizations o ON p.organization_id = o.id WHERE p.passcode = ?");
$stmt->bind_param("s", $passcode_val);
$stmt->execute();
$res = $stmt->get_result();
$code = $res->fetch_assoc();

if (!$code) {
    echo json_encode(["success" => false, "message" => "Passcode not found."]);
    exit();
}

if ($code['status'] === 'suspended') {
    echo json_encode(["success" => false, "message" => "This passcode has been suspended."]);
    exit();
}

echo json_encode([
    "success" => true,
    "passcode" => [
        "id" => $code['id'],
        "passcode" => $code['passcode'],
        "email" => $code['email'],
        "organization_name" => $code['organization_name'],
        "exam_category" => $code['exam_category'] ?: 'JAMB',
        "allowed_subjects" => $code['allowed_subjects'] ?: '',
        "max_devices" => $code['max_devices'],
        "activated_devices" => $code['activated_devices'],
        "duration_days" => $code['duration_days'],
        "status" => $code['status'],
        "expires_at" => $code['expires_at']
    ]
]);
