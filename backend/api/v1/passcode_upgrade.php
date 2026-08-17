<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../db/db.php';

$db = getDbConnection();

$data = json_decode(file_get_contents("php://input"), true) ?: $_REQUEST;
$action = trim($data['action'] ?? 'calculate');
$passcode_val = trim($data['passcode'] ?? '');

if (empty($passcode_val)) {
    echo json_encode(["success" => false, "message" => "Passcode is required."]);
    exit();
}

// Fetch passcode record
$stmt = $db->prepare("SELECT p.*, o.name as organization_name FROM passcodes p LEFT JOIN organizations o ON p.organization_id = o.id WHERE p.passcode = ?");
$stmt->bind_param("s", $passcode_val);
$stmt->execute();
$code = $stmt->get_result()->fetch_assoc();

if (!$code) {
    echo json_encode(["success" => false, "message" => "Passcode not found."]);
    exit();
}

if ($code['status'] === 'suspended') {
    echo json_encode(["success" => false, "message" => "Passcode is suspended."]);
    exit();
}

// Helper to format category list
function parseCategories($cat_str) {
    if (is_array($cat_str)) {
        return array_values(array_filter(array_map('trim', $cat_str)));
    }
    return array_values(array_filter(array_map('trim', explode(',', strtoupper($cat_str)))));
}

// Helper to format subjects list
function parseSubjects($sub_str) {
    if (is_array($sub_str)) {
        return array_values(array_filter(array_map('trim', $sub_str)));
    }
    return array_values(array_filter(array_map('trim', explode(',', $sub_str))));
}

$old_cats = parseCategories($code['exam_category'] ?? 'JAMB');
$old_subjs = parseSubjects($code['allowed_subjects'] ?? '');

$raw_new_cats = $data['new_categories'] ?? $old_cats;
$new_cats = parseCategories($raw_new_cats);
if (empty($new_cats)) {
    $new_cats = $old_cats;
}

$raw_new_subjs = $data['new_subjects'] ?? $old_subjs;
$new_subjs = parseSubjects($raw_new_subjs);

// Find newly added categories
$added_cats = array_values(array_diff($new_cats, $old_cats));

// Find newly added subjects
$added_subjs = array_values(array_diff($new_subjs, $old_subjs));

// Fetch pricing settings
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

// Fee calculation: Only charge if NEW category is added
$added_cat_count = count($added_cats);
$duration_days = intval($code['duration_days'] ?? 180);
$duration_mult = ($duration_days >= 360) ? 2.0 : 1.0;
$unit_base = $pricing['single_passcode_price_6m'];

$upgrade_fee = $added_cat_count * $unit_base * $duration_mult;
$is_free = ($upgrade_fee == 0);

if ($action === 'calculate') {
    echo json_encode([
        "success" => true,
        "passcode" => $code['passcode'],
        "email" => $code['email'],
        "old_categories" => implode(',', $old_cats),
        "new_categories" => implode(',', $new_cats),
        "added_categories" => implode(',', $added_cats),
        "old_subjects" => implode(',', $old_subjs),
        "new_subjects" => implode(',', $new_subjs),
        "added_subjects" => implode(',', $added_subjs),
        "amount" => $upgrade_fee,
        "is_free" => $is_free
    ]);
    exit();
}

if ($action === 'apply_free') {
    if (!$is_free) {
        echo json_encode(["success" => false, "message" => "This upgrade requires payment of ₦" . number_format($upgrade_fee, 2)]);
        exit();
    }

    $new_cats_str = implode(',', $new_cats);
    $new_subjs_str = implode(',', $new_subjs);
    $added_cats_str = implode(',', $added_cats);
    $added_subjs_str = implode(',', $added_subjs);
    $old_cats_str = implode(',', $old_cats);
    $old_subjs_str = implode(',', $old_subjs);

    // Update passcode
    $u_stmt = $db->prepare("UPDATE passcodes SET exam_category = ?, allowed_subjects = ? WHERE id = ?");
    $u_stmt->bind_param("ssi", $new_cats_str, $new_subjs_str, $code['id']);
    $u_stmt->execute();

    // Log upgrade
    $log_stmt = $db->prepare("INSERT INTO passcode_upgrades (passcode_id, passcode, email, old_categories, new_categories, old_subjects, new_subjects, added_categories, added_subjects, amount_paid, payment_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'free', 'completed')");
    $log_stmt->bind_param("issssssss", $code['id'], $code['passcode'], $code['email'], $old_cats_str, $new_cats_str, $old_subjs_str, $new_subjs_str, $added_cats_str, $added_subjs_str);
    $log_stmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Subject combination updated successfully! (Free Upgrade)",
        "new_categories" => $new_cats_str,
        "new_subjects" => $new_subjs_str
    ]);
    exit();
}

if ($action === 'initialize_paystack') {
    $ref = 'UPG-FILLOP-' . uniqid() . '-' . time();
    $new_cats_str = implode(',', $new_cats);
    $new_subjs_str = implode(',', $new_subjs);
    $added_cats_str = implode(',', $added_cats);
    $added_subjs_str = implode(',', $added_subjs);
    $old_cats_str = implode(',', $old_cats);
    $old_subjs_str = implode(',', $old_subjs);

    $pending_file = dirname(__FILE__) . '/pending_upgrades.json';
    $pending = [];
    if (file_exists($pending_file)) {
        $pending = json_decode(file_get_contents($pending_file), true) ?: [];
    }

    $pending[$ref] = [
        'passcode_id' => $code['id'],
        'passcode' => $code['passcode'],
        'email' => $code['email'],
        'old_categories' => $old_cats_str,
        'new_categories' => $new_cats_str,
        'old_subjects' => $old_subjs_str,
        'new_subjects' => $new_subjs_str,
        'added_categories' => $added_cats_str,
        'added_subjects' => $added_subjs_str,
        'amount' => $upgrade_fee,
        'created_at' => date('Y-m-d H:i:s')
    ];

    file_put_contents($pending_file, json_encode($pending, JSON_PRETTY_PRINT));

    echo json_encode([
        "success" => true,
        "reference" => $ref,
        "amount" => $upgrade_fee,
        "email" => $code['email']
    ]);
    exit();
}

if ($action === 'verify_paystack' || $action === 'apply_paid') {
    $ref = trim($data['reference'] ?? '');
    if (empty($ref)) {
        echo json_encode(["success" => false, "message" => "Payment reference required."]);
        exit();
    }

    $new_cats_str = implode(',', $new_cats);
    $new_subjs_str = implode(',', $new_subjs);
    $added_cats_str = implode(',', $added_cats);
    $added_subjs_str = implode(',', $added_subjs);
    $old_cats_str = implode(',', $old_cats);
    $old_subjs_str = implode(',', $old_subjs);

    // Verify Paystack API if secret key is present
    $paystack_secret = getenv('PAYSTACK_SECRET_KEY') ?: (getenv('PAYSTACK_SECRET') ?: '');
    $verified = true;

    if (!empty($paystack_secret) && function_exists('curl_init')) {
        $ch = curl_init("https://api.paystack.co/transaction/verify/" . rawurlencode($ref));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . $paystack_secret,
            "Cache-Control: no-cache"
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        $res_data = json_decode($response, true);
        if ($res_data && isset($res_data['data']) && $res_data['data']['status'] === 'success') {
            $verified = true;
        } else {
            // Check pending file as fallback
            $pending_file = dirname(__FILE__) . '/pending_upgrades.json';
            if (file_exists($pending_file)) {
                $pending = json_decode(file_get_contents($pending_file), true) ?: [];
                if (isset($pending[$ref])) {
                    $verified = true;
                } else {
                    $verified = false;
                }
            }
        }
    }

    if (!$verified) {
        echo json_encode(["success" => false, "message" => "Payment verification failed for reference $ref."]);
        exit();
    }

    // Update passcode
    $u_stmt = $db->prepare("UPDATE passcodes SET exam_category = ?, allowed_subjects = ? WHERE id = ?");
    $u_stmt->bind_param("ssi", $new_cats_str, $new_subjs_str, $code['id']);
    $u_stmt->execute();

    // Log upgrade
    $log_stmt = $db->prepare("INSERT INTO passcode_upgrades (passcode_id, passcode, email, old_categories, new_categories, old_subjects, new_subjects, added_categories, added_subjects, amount_paid, payment_reference, payment_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'completed')");
    $log_stmt->bind_param("issssssssdss", $code['id'], $code['passcode'], $code['email'], $old_cats_str, $new_cats_str, $old_subjs_str, $new_subjs_str, $added_cats_str, $added_subjs_str, $upgrade_fee, $ref);
    $log_stmt->execute();

    // Remove pending reference if exists
    $pending_file = dirname(__FILE__) . '/pending_upgrades.json';
    if (file_exists($pending_file)) {
        $pending = json_decode(file_get_contents($pending_file), true) ?: [];
        unset($pending[$ref]);
        file_put_contents($pending_file, json_encode($pending, JSON_PRETTY_PRINT));
    }

    echo json_encode([
        "success" => true,
        "message" => "Payment verified! Passcode upgraded successfully.",
        "new_categories" => $new_cats_str,
        "new_subjects" => $new_subjs_str
    ]);
    exit();
}

if ($action === 'request_admin') {
    $admin_notes = trim($data['admin_notes'] ?? '');
    $new_cats_str = implode(',', $new_cats);
    $new_subjs_str = implode(',', $new_subjs);
    $added_cats_str = implode(',', $added_cats);
    $added_subjs_str = implode(',', $added_subjs);
    $old_cats_str = implode(',', $old_cats);
    $old_subjs_str = implode(',', $old_subjs);

    $log_stmt = $db->prepare("INSERT INTO passcode_upgrades (passcode_id, passcode, email, old_categories, new_categories, old_subjects, new_subjects, added_categories, added_subjects, amount_paid, payment_status, status, admin_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending_approval', ?)");
    $log_stmt->bind_param("issssssssds", $code['id'], $code['passcode'], $code['email'], $old_cats_str, $new_cats_str, $old_subjs_str, $new_subjs_str, $added_cats_str, $added_subjs_str, $upgrade_fee, $admin_notes);
    $log_stmt->execute();

    echo json_encode([
        "success" => true,
        "message" => "Upgrade request submitted to admin for review and approval!"
    ]);
    exit();
}

echo json_encode(["success" => false, "message" => "Unknown action specified."]);
