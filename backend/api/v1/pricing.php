<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $res = $db->query("SELECT setting_key, setting_value FROM pricing_settings");
    $settings = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $settings[$row['setting_key']] = (float)$row['setting_value'];
        }
    }

    // Default fallbacks if table not populated
    $defaults = [
        'single_passcode_price_6m' => 1400.00,
        'small_bulk_price_6m' => 1100.00,
        'large_bulk_price_6m' => 1000.00
    ];

    $final_settings = array_merge($defaults, $settings);

    echo json_encode([
        "success" => true,
        "pricing" => $final_settings
    ]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    if (isset($data['single_passcode_price_6m'])) {
        $val = floatval($data['single_passcode_price_6m']);
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('single_passcode_price_6m', ?, 'Single passcode price 6m') ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt->bind_param("dd", $val, $val);
        $stmt->execute();
    }

    if (isset($data['small_bulk_price_6m'])) {
        $val = floatval($data['small_bulk_price_6m']);
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('small_bulk_price_6m', ?, 'Small bulk price 6m') ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt->bind_param("dd", $val, $val);
        $stmt->execute();
    }

    if (isset($data['large_bulk_price_6m'])) {
        $val = floatval($data['large_bulk_price_6m']);
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('large_bulk_price_6m', ?, 'Large bulk price 6m') ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt->bind_param("dd", $val, $val);
        $stmt->execute();
    }

    echo json_encode([
        "success" => true,
        "message" => "Pricing settings updated successfully."
    ]);
    exit();
}
