<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid request payload."]);
    exit();
}

$email = trim($data['email'] ?? '');
$passcode = trim($data['passcode'] ?? '');
$device_uuid = trim($data['device_uuid'] ?? '');
$hardware_hash = trim($data['hardware_hash'] ?? '');

if (empty($email) || empty($passcode) || empty($device_uuid)) {
    echo json_encode(["success" => false, "message" => "Email, passcode, and device identifier are required."]);
    exit();
}

$db = getDbConnection();

// Fetch passcode record
$stmt = $db->prepare("SELECT * FROM passcodes WHERE passcode = ? AND email = ?");
$stmt->bind_param("ss", $passcode, $email);
$stmt->execute();
$res = $stmt->get_result();
$code_row = $res->fetch_assoc();

if (!$code_row) {
    echo json_encode(["success" => false, "message" => "Invalid passcode or email address. Please verify your credentials."]);
    exit();
}

// Fetch user profile name and profile picture from users table matching email
$user_stmt = $db->prepare("SELECT name, profile_picture FROM users WHERE email = ?");
$user_stmt->bind_param("s", $email);
$user_stmt->execute();
$user_res = $user_stmt->get_result();
$user_row = $user_res->fetch_assoc();

$user_name = $user_row ? $user_row['name'] : 'Student';
$profile_picture = $user_row ? $user_row['profile_picture'] : null;

if ($code_row['status'] === 'suspended') {
    echo json_encode(["success" => false, "message" => "This passcode has been suspended. Please contact Fillop Tech support."]);
    exit();
}

// Check expiration if set
if (!empty($code_row['expires_at'])) {
    $expires = strtotime($code_row['expires_at']);
    if ($expires < time()) {
        echo json_encode(["success" => false, "message" => "This subscription passcode has expired."]);
        exit();
    }
}

// Check if device already registered
$stmt = $db->prepare("SELECT * FROM devices WHERE passcode_id = ? AND device_uuid = ?");
$stmt->bind_param("is", $code_row['id'], $device_uuid);
$stmt->execute();
$res = $stmt->get_result();
$device_row = $res->fetch_assoc();

if ($device_row) {
    // Already bound, just succeed
    $expiry_date = $code_row['expires_at'] ? date('c', strtotime($code_row['expires_at'])) : date('c', time() + ($code_row['duration_days'] * 86400));
    echo json_encode([
        "success" => true,
        "message" => "Device re-authenticated successfully.",
        "expiry_date" => $expiry_date,
        "user_name" => $user_name,
        "profile_picture" => $profile_picture
    ]);
    exit();
}

// Attempt to bind new device
if ($code_row['activated_devices'] >= $code_row['max_devices']) {
    echo json_encode([
        "success" => false,
        "message" => "Activation limit reached (" . $code_row['max_devices'] . " device slots). This passcode is already bound to other hardware."
    ]);
    exit();
}

// Bind new device
$stmt = $db->prepare("INSERT INTO devices (passcode_id, device_uuid, hardware_hash) VALUES (?, ?, ?)");
$stmt->bind_param("iss", $code_row['id'], $device_uuid, $hardware_hash);
$stmt->execute();

// Increment activation count and set expires_at if first activation
$new_activated = $code_row['activated_devices'] + 1;
$expires_at_val = $code_row['expires_at'];

if (empty($expires_at_val)) {
    // Set expiry from first activation date
    $days = intval($code_row['duration_days']);
    $expires_at_val = date('Y-m-d H:i:s', time() + ($days * 86400));

    $stmt = $db->prepare("UPDATE passcodes SET activated_devices = ?, expires_at = ? WHERE id = ?");
    $stmt->bind_param("isi", $new_activated, $expires_at_val, $code_row['id']);
    $stmt->execute();
} else {
    $stmt = $db->prepare("UPDATE passcodes SET activated_devices = ? WHERE id = ?");
    $stmt->bind_param("ii", $new_activated, $code_row['id']);
    $stmt->execute();
}

echo json_encode([
    "success" => true,
    "message" => "Activation successful! App is now registered on this device.",
    "expiry_date" => date('c', strtotime($expires_at_val)),
    "user_name" => $user_name,
    "profile_picture" => $profile_picture
]);
