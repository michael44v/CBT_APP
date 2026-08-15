<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../db/db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["success" => false, "message" => "Invalid request payload."]);
    exit();
}

$name = trim($data['name'] ?? 'Candidate');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$state = trim($data['state'] ?? '');
$school = trim($data['school'] ?? '');

$exam_category = strtoupper(trim($data['exam_category'] ?? 'JAMB')); // JAMB, WAEC, NECO, ALL
$selected_subjects = $data['selected_subjects'] ?? []; // array or comma-separated string
$max_devices = max(1, intval($data['max_devices'] ?? 1));
$duration_months = max(1, intval($data['duration_months'] ?? 1));
$duration_days = $duration_months * 30;

$promo_code_input = strtoupper(trim($data['promo_code'] ?? ''));

if (empty($email)) {
    echo json_encode(["success" => false, "message" => "Email address is required."]);
    exit();
}

// Convert selected_subjects to array and list
if (is_string($selected_subjects)) {
    $selected_subjects_arr = array_values(array_filter(array_map('trim', explode(',', $selected_subjects))));
} else if (is_array($selected_subjects)) {
    $selected_subjects_arr = array_values($selected_subjects);
} else {
    $selected_subjects_arr = [];
}

// Support structured subject breakdown if sent from frontend
$category_subjects = $data['category_subjects'] ?? null;

if (is_array($category_subjects)) {
    // Structured per exam card validation
    if ($exam_category === 'JAMB' || $exam_category === 'ALL') {
        $jamb_subjs = $category_subjects['JAMB'] ?? [];
        $cnt = count($jamb_subjs);
        if ($exam_category === 'JAMB' && ($cnt < 4 || $cnt > 5)) {
            echo json_encode(["success" => false, "message" => "JAMB requires a minimum of 4 subjects and a maximum of 5 subjects."]);
            exit();
        }
    }
    if ($exam_category === 'WAEC' || $exam_category === 'ALL') {
        $waec_subjs = $category_subjects['WAEC'] ?? [];
        $cnt = count($waec_subjs);
        if ($exam_category === 'WAEC' && ($cnt < 4 || $cnt > 9)) {
            echo json_encode(["success" => false, "message" => "WAEC requires a minimum of 4 subjects and a maximum of 9 subjects."]);
            exit();
        }
    }
    if ($exam_category === 'NECO' || $exam_category === 'ALL') {
        $neco_subjs = $category_subjects['NECO'] ?? [];
        $cnt = count($neco_subjs);
        if ($exam_category === 'NECO' && ($cnt < 4 || $cnt > 9)) {
            echo json_encode(["success" => false, "message" => "NECO requires a minimum of 4 subjects and a maximum of 9 subjects."]);
            exit();
        }
    }
    if ($exam_category === 'ALL') {
        $j_cnt = count($category_subjects['JAMB'] ?? []);
        $w_cnt = count($category_subjects['WAEC'] ?? []);
        $n_cnt = count($category_subjects['NECO'] ?? []);
        if ($j_cnt < 4 || $j_cnt > 5) {
            echo json_encode(["success" => false, "message" => "JAMB section requires 4 to 5 subjects."]);
            exit();
        }
        if ($w_cnt < 4 || $w_cnt > 9) {
            echo json_encode(["success" => false, "message" => "WAEC section requires 4 to 9 subjects."]);
            exit();
        }
        if ($n_cnt < 4 || $n_cnt > 9) {
            echo json_encode(["success" => false, "message" => "NECO section requires 4 to 9 subjects."]);
            exit();
        }
    }
} else {
    $num_subjects = count($selected_subjects_arr);
    // Standard rule
    if ($exam_category === 'JAMB') {
        if ($num_subjects < 4 || $num_subjects > 5) {
            echo json_encode(["success" => false, "message" => "JAMB requires a minimum of 4 subjects and a maximum of 5 subjects."]);
            exit();
        }
    } else if ($exam_category === 'WAEC' || $exam_category === 'NECO' || $exam_category === 'ALL') {
        if ($num_subjects < 4 || $num_subjects > 9) {
            echo json_encode(["success" => false, "message" => "$exam_category requires a minimum of 4 subjects and a maximum of 9 subjects."]);
            exit();
        }
    }
}

$total_num_subjects = count($selected_subjects_arr);

// Pricing formula:
// 500 per category, 300 per subject, 100 per month, 100 per device
$num_categories = ($exam_category === 'ALL') ? 3 : 1;
$category_cost = $num_categories * 500;
$subject_cost = $total_num_subjects * 300;
$duration_cost = $duration_months * 100;
$device_cost = $max_devices * 100;

$total_amount = $category_cost + $subject_cost + $duration_cost + $device_cost;

$db = getDbConnection();

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

    if ($promo) {
        if ($promo['max_uses'] > $promo['uses_count']) {
            $promo_id = $promo['id'];
            $promo_applied = true;
            if ($promo['discount_type'] === 'free') {
                $discount = $total_amount;
            } elseif ($promo['discount_type'] === 'percentage') {
                $discount = ($total_amount * $promo['discount_value']) / 100;
            } elseif ($promo['discount_type'] === 'fixed') {
                $discount = min($total_amount, $promo['discount_value']);
            }
        }
    }
}

$final_amount = max(0, $total_amount - $discount);

// Ensure user is created/updated
$stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();
$user_row = $res->fetch_assoc();

if (!$user_row) {
    $stmt = $db->prepare("INSERT INTO users (name, email, phone, state, school) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $name, $email, $phone, $state, $school);
    $stmt->execute();
} else {
    $stmt = $db->prepare("UPDATE users SET name = ?, phone = ?, state = ?, school = ? WHERE email = ?");
    $stmt->bind_param("sssss", $name, $phone, $state, $school, $email);
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
    'exam_category' => $exam_category,
    'allowed_subjects' => $allowed_subjects_str,
    'max_devices' => $max_devices,
    'duration_days' => $duration_days,
    'final_amount' => $final_amount,
    'promo_id' => $promo_id,
    'created_at' => date('Y-m-d H:i:s')
];

file_put_contents($pending_file, json_encode($pending, JSON_PRETTY_PRINT));

if ($final_amount == 0) {
    echo json_encode([
        "success" => true,
        "message" => "Registration successful. Free promo applied!",
        "amount" => 0,
        "reference" => $payment_reference,
        "auto_verify" => true
    ]);
    exit();
}

echo json_encode([
    "success" => true,
    "message" => "Subscription calculated successfully.",
    "amount" => $final_amount,
    "reference" => $payment_reference,
    "auto_verify" => false
]);
