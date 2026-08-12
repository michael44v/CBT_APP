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

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$state = trim($data['state'] ?? '');
$school = trim($data['school'] ?? '');
$pack_type = trim($data['pack_type'] ?? 'individual_1'); // 'individual_1' | 'individual_5' | 'individual_10' | 'institutional_bulk'
$bulk_count = intval($data['bulk_count'] ?? 1);
$promo_code_input = strtoupper(trim($data['promo_code'] ?? ''));

if (empty($name) || empty($email)) {
    echo json_encode(["success" => false, "message" => "Name and Email are required fields."]);
    exit();
}

$db = getDbConnection();

// Prices in NGN
$prices = [
    'individual_1' => 1500,
    'individual_5' => 6500,
    'individual_10' => 12000,
    'institutional_bulk' => 1000 // Price per login
];

$base_price = $prices[$pack_type] ?? 1500;
$total_amount = $base_price;
if ($pack_type === 'institutional_bulk') {
    $total_amount = $base_price * max(1, $bulk_count);
}

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

// Generate payment reference
$payment_reference = 'FILLOP-' . uniqid() . '-' . time();

// Save metadata/pending passcode creation to complete after webhook/verification
// For MVP we serialize checkout context in a temporary file/table or local session simulation.
// Let's write a simple transient JSON mapping for verification simulation.
$pending_file = dirname(__FILE__) . '/pending_payments.json';
$pending = [];
if (file_exists($pending_file)) {
    $pending = json_decode(file_get_contents($pending_file), true) ?: [];
}

$pending[$payment_reference] = [
    'name' => $name,
    'email' => $email,
    'pack_type' => $pack_type,
    'bulk_count' => $pack_type === 'institutional_bulk' ? $bulk_count : ($pack_type === 'individual_1' ? 1 : ($pack_type === 'individual_5' ? 5 : 10)),
    'final_amount' => $final_amount,
    'promo_id' => $promo_id,
    'created_at' => date('Y-m-d H:i:s')
];

file_put_contents($pending_file, json_encode($pending, JSON_PRETTY_PRINT));

// If final amount is 0 (Free due to promo code), we can auto-verify without Paystack!
if ($final_amount == 0) {
    echo json_encode([
        "success" => true,
        "message" => "Registration successful. Free promo applied!",
        "amount" => 0,
        "reference" => $payment_reference,
        "payment_url" => null, // trigger instant verification
        "auto_verify" => true
    ]);
    exit();
}

// Simulate Paystack Initialization
// In real life, we would curl 'https://api.paystack.co/transaction/initialize'
// with authorization Bearer secret key and send: email, amount (in kobo), reference, callback_url.
// Let's write the simulated curl response beautifully, but also support direct simulation.
$paystack_url = "https://checkout.paystack.com/mock-gateway-" . $payment_reference;

echo json_encode([
    "success" => true,
    "message" => "Transaction initialized successfully.",
    "amount" => $final_amount,
    "reference" => $payment_reference,
    "payment_url" => $paystack_url,
    "auto_verify" => false
]);
