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

    // Raw string settings (e.g., instructions)
    $resRaw = $db->query("SELECT setting_key, setting_value FROM pricing_settings");
    $rawSettings = [];
    if ($resRaw) {
        while ($row = $resRaw->fetch_assoc()) {
            $rawSettings[$row['setting_key']] = $row['setting_value'];
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
        "pricing" => $final_settings,
        "exam_instructions" => $rawSettings['exam_instructions'] ?? "Read all questions carefully before choosing your answer.\nEnsure you manage your time effectively.\nClick Submit when you are finished.",
        "study_instructions" => $rawSettings['study_instructions'] ?? "Study mode allows you to practice at your own pace.\nDetailed explanations are available for every question.\nClick STUDY THIS QUESTION to reveal answers."
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

    if (isset($data['exam_instructions'])) {
        $val = trim($data['exam_instructions']);
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('exam_instructions', ?, 'Pre-exam instructions for exam mode') ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt->bind_param("ss", $val, $val);
        $stmt->execute();
    }

    if (isset($data['study_instructions'])) {
        $val = trim($data['study_instructions']);
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('study_instructions', ?, 'Pre-exam instructions for study mode') ON DUPLICATE KEY UPDATE setting_value = ?");
        $stmt->bind_param("ss", $val, $val);
        $stmt->execute();
    }

    echo json_encode([
        "success" => true,
        "message" => "Settings updated successfully."
    ]);
    exit();
}
