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

$email = trim($details['email'] ?? '');
$name = trim($details['name'] ?? '');
$phone = trim($details['phone'] ?? '');
$org_name = trim($details['organization_name'] ?? '');
$org_type = trim($details['organization_type'] ?? 'school');
$quantity = max(1, intval($details['quantity'] ?? 1));
$max_devices = intval($details['max_devices'] ?? 1);
$duration_days = intval($details['duration_days'] ?? 180);
$exam_category = trim($details['exam_category'] ?? 'ALL');
$allowed_subjects = trim($details['allowed_subjects'] ?? '');

$org_id = null;
if (!empty($org_name)) {
    $stmt = $db->prepare("SELECT id FROM organizations WHERE name = ?");
    $stmt->bind_param("s", $org_name);
    $stmt->execute();
    $org_res = $stmt->get_result()->fetch_assoc();

    if ($org_res) {
        $org_id = $org_res['id'];
        $stmt = $db->prepare("UPDATE organizations SET contact_person = ?, contact_email = ?, contact_phone = ?, type = ? WHERE id = ?");
        $stmt->bind_param("ssssi", $name, $email, $phone, $org_type, $org_id);
        $stmt->execute();
    } else {
        $stmt = $db->prepare("INSERT INTO organizations (name, type, contact_person, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $org_name, $org_type, $name, $email, $phone);
        $stmt->execute();
        $org_id = $db->insert_id;
    }
}

$generated_passcodes = [];

for ($i = 0; $i < $quantity; $i++) {
    $passcode = generateUniquePasscode();
    $stmt = $db->prepare("INSERT INTO passcodes (passcode, email, organization_id, exam_category, allowed_subjects, max_devices, duration_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')");
    $stmt->bind_param("ssissii", $passcode, $email, $org_id, $exam_category, $allowed_subjects, $max_devices, $duration_days);
    $stmt->execute();
    $generated_passcodes[] = $passcode;
}

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
    "passcode" => $generated_passcodes[0],
    "passcodes" => $generated_passcodes,
    "quantity" => $quantity,
    "email" => $email,
    "exam_category" => $exam_category,
    "allowed_subjects" => $allowed_subjects,
    "max_devices" => $max_devices,
    "duration_days" => $duration_days
]);
