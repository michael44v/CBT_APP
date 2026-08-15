<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../db/db.php';

$data = json_decode(file_get_contents("php://input"), true);
$reference = trim($data['reference'] ?? '');

if (empty($reference)) {
    echo json_encode(["success" => false, "message" => "Payment reference is required."]);
    exit();
}

$pending_json_path = dirname(dirname(__FILE__)) . '/pending_payments.json';

if (!file_exists($pending_json_path)) {
    echo json_encode(["success" => false, "message" => "Reference not found."]);
    exit();
}

$pending = json_decode(file_get_contents($pending_json_path), true) ?: [];

if (!isset($pending[$reference])) {
    echo json_encode(["success" => false, "message" => "Invalid or expired payment reference."]);
    exit();
}

$details = $pending[$reference];
$db = getDbConnection();

function generateUniquePasscode() {
    return 'GP-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));
}

$passcode = generateUniquePasscode();
$max_devices = intval($details['max_devices'] ?? 1);
$duration_days = intval($details['duration_days'] ?? 180);
$exam_category = trim($details['exam_category'] ?? 'ALL');
$allowed_subjects = trim($details['allowed_subjects'] ?? '');

// Insert passcode with exam_category and allowed_subjects
$stmt = $db->prepare("INSERT INTO passcodes (passcode, email, exam_category, allowed_subjects, max_devices, duration_days, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
$stmt->bind_param("ssssii", $passcode, $details['email'], $exam_category, $allowed_subjects, $max_devices, $duration_days);
$stmt->execute();

if (!empty($details['promo_id'])) {
    $promo_id = intval($details['promo_id']);
    $stmt = $db->prepare("UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?");
    $stmt->bind_param("i", $promo_id);
    $stmt->execute();
}

unset($pending[$reference]);
file_put_contents($pending_json_path, json_encode($pending, JSON_PRETTY_PRINT));

echo json_encode([
    "success" => true,
    "message" => "Payment verified successfully!",
    "passcode" => $passcode,
    "email" => $details['email'],
    "exam_category" => $exam_category,
    "allowed_subjects" => $allowed_subjects,
    "max_devices" => $max_devices,
    "duration_days" => $duration_days
]);
