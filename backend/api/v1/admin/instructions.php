<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../db.php';

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$default_exam_inst = "Read all questions carefully before choosing your answer.<br>Ensure you manage your time effectively.<br>Click Submit when you are finished.";
$default_study_inst = "Study mode allows you to practice at your own pace.<br>Detailed explanations are available for every question.<br>Click STUDY THIS QUESTION to reveal answers.";

if ($method === 'GET') {
    $res = $db->query("SELECT setting_key, description, setting_value FROM pricing_settings WHERE setting_key IN ('exam_instructions', 'study_instructions')");
    $raw = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $val = !empty($row['description']) ? $row['description'] : (is_numeric($row['setting_value']) ? '' : $row['setting_value']);
            $raw[$row['setting_key']] = $val;
        }
    }

    echo json_encode([
        "success" => true,
        "exam_instructions" => !empty($raw['exam_instructions']) ? $raw['exam_instructions'] : $default_exam_inst,
        "study_instructions" => !empty($raw['study_instructions']) ? $raw['study_instructions'] : $default_study_inst
    ]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    $exam_inst = isset($data['exam_instructions']) ? trim($data['exam_instructions']) : null;
    $study_inst = isset($data['study_instructions']) ? trim($data['study_instructions']) : null;

    if ($exam_inst !== null) {
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('exam_instructions', 0, ?) ON DUPLICATE KEY UPDATE description = ?");
        $stmt->bind_param("ss", $exam_inst, $exam_inst);
        $stmt->execute();
    }

    if ($study_inst !== null) {
        $stmt = $db->prepare("INSERT INTO pricing_settings (setting_key, setting_value, description) VALUES ('study_instructions', 0, ?) ON DUPLICATE KEY UPDATE description = ?");
        $stmt->bind_param("ss", $study_inst, $study_inst);
        $stmt->execute();
    }

    echo json_encode([
        "success" => true,
        "message" => "Instructions saved successfully.",
        "exam_instructions" => $exam_inst,
        "study_instructions" => $study_inst
    ]);
    exit();
}
