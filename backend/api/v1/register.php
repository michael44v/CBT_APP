<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);

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

$name = trim($data['name'] ?? 'Candidate');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$state = trim($data['state'] ?? '');
$organization_name = trim($data['organization_name'] ?? '');
$organization_type = trim($data['organization_type'] ?? 'Individual');
$quantity = max(1, intval($data['quantity'] ?? 1));

$exam_category = strtoupper(trim($data['exam_category'] ?? 'JAMB')); // e.g. JAMB or JAMB,WAEC
$selected_subjects = $data['selected_subjects'] ?? []; // array or comma-separated string
$max_devices = max(1, intval($data['max_devices'] ?? 1));
$duration_months = max(1, intval($data['duration_months'] ?? 6));
$duration_days = ($duration_months >= 12) ? 365 : 180;

$promo_code_input = strtoupper(trim($data['promo_code'] ?? ''));

if (empty($email)) {
    echo json_encode(["success" => false, "message" => "Email address is required."]);
    exit();
}

// Extract selected categories
$categories_arr = array_values(array_filter(array_map('trim', explode(',', $exam_category))));
if (empty($categories_arr)) {
    $categories_arr = ['JAMB'];
}
$category_count = count($categories_arr);

// Convert selected_subjects to array
if (is_string($selected_subjects)) {
    $selected_subjects_arr = array_values(array_filter(array_map('trim', explode(',', $selected_subjects))));
} else if (is_array($selected_subjects)) {
    $selected_subjects_arr = array_values($selected_subjects);
} else {
    $selected_subjects_arr = [];
}

$db = getDbConnection();

// Fetch live pricing settings
$res = $db->query("SELECT setting_key, setting_value FROM pricing_settings");
$pricing = [
    'single_passcode_price_6m' => 1400.00,
    'small_bulk_price_6m' => 1100.00,
    'large_bulk_price_6m' => 1000.00
];
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $pricing[$row['setting_key']] = floatval($row['setting_value']);
    }
}

// Unit base price for 6m
if ($quantity >= 10) {
    $unit_base = $pricing['large_bulk_price_6m'];
} elseif ($quantity >= 2) {
    $unit_base = $pricing['small_bulk_price_6m'];
} else {
    $unit_base = $pricing['single_passcode_price_6m'];
}

$duration_mult = ($duration_months >= 12) ? 2.0 : 1.0;
$unit_price_per_passcode = $unit_base * $category_count * $duration_mult;
$total_amount = $unit_price_per_passcode * $quantity;

// Check promo code if any
$discount = 0;
$promo_applied = false;
$promo_id = null;

if (!empty($promo_code_input)) {
    $stmt = $db->prepare("SELECT * FROM promo_codes WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)");
    $stmt->bind_param("s", $promo_code_input);
    $stmt->execute();
    $res = $stmt->get_result();
    $promo = $res->fetch_assoc();

    if ($promo && $promo['max_uses'] > $promo['uses_count']) {
        $promo_id = $promo['id'];
        $promo_applied = true;
        if ($promo['discount_type'] === 'free') {
            $discount = $total_amount;
        } elseif ($promo['discount_type'] === 'percentage') {
            $discount = ($total_amount * floatval($promo['discount_value'])) / 100;
        } elseif ($promo['discount_type'] === 'fixed') {
            $discount = min($total_amount, floatval($promo['discount_value']));
        }
    }
}

$final_amount = max(0, $total_amount - $discount);

// Update/Create User
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();
$user_row = $res->fetch_assoc();

if (!$user_row) {
    $stmt = $db->prepare("INSERT INTO users (name, email, phone, school) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $name, $email, $phone, $organization_name);
    $stmt->execute();
} else {
    $stmt = $db->prepare("UPDATE users SET name = ?, phone = ?, school = ? WHERE email = ?");
    $stmt->bind_param("ssss", $name, $phone, $organization_name, $email);
    $stmt->execute();
}

$allowed_subjects_str = implode(',', $selected_subjects_arr);
$payment_reference = 'FILLOP-' . uniqid() . '-' . time();

$pending_file = dirname(__FILE__) . '/pending_payments.json';
$pending = [];
if (file_exists($pending_file)) {
    $pending = json_decode(file_get_contents($pending_file), true) ?: [];
}

$pending[$payment_reference] = [
    'name' => $name,
    'email' => $email,
    'phone' => $phone,
    'state' => $state,
    'organization_name' => $organization_name,
    'organization_type' => $organization_type,
    'quantity' => $quantity,
    'exam_category' => implode(',', $categories_arr),
    'allowed_subjects' => $allowed_subjects_str,
    'max_devices' => $max_devices,
    'duration_days' => $duration_days,
    'final_amount' => $final_amount,
    'promo_id' => $promo_id,
    'created_at' => date('Y-m-d H:i:s')
];

$result = file_put_contents(
    $pending_file,
    json_encode($pending, JSON_PRETTY_PRINT),
    LOCK_EX
);

if ($result === false) {
    echo json_encode([
        "success" => false,
        "message" => "Unable to save pending payment."
    ]);
    exit();
}

echo json_encode([
    "success" => true,
    "message" => "Subscription calculated successfully.",
    "amount" => $final_amount,
    "reference" => $payment_reference,
    "auto_verify" => ($final_amount == 0)
]);
