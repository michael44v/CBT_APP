<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}


require_once '../db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['results']) || !is_array($data['results'])) {
    echo json_encode(["success" => false, "message" => "Invalid or empty results sync payload."]);
    exit();
}

$db = getDbConnection();
$synced_count = 0;

foreach ($data['results'] as $result) {
    $email = trim($result['email'] ?? '');
    $exam_type = trim($result['exam_type'] ?? 'JAMB');
    $score = intval($result['score'] ?? 0);
    $total_questions = intval($result['total_questions'] ?? 0);
    $percentage = floatval($result['percentage'] ?? 0.0);
    $details = trim($result['details'] ?? '{}');
    
    // Safely parse and convert potential ISO 8601 or other timestamp strings to MySQL compatible format
    $raw_submitted_at = trim($result['submitted_at'] ?? '');
    $parsed_time = !empty($raw_submitted_at) ? strtotime($raw_submitted_at) : false;
    if ($parsed_time === false) {
        $submitted_at = date('Y-m-d H:i:s');
    } else {
        $submitted_at = date('Y-m-d H:i:s', $parsed_time);
    }

    if (empty($email)) {
        continue;
    }

    // Insert sync record with safe execution and error handling
    $stmt = $db->prepare("INSERT INTO results (email, exam_type, score, total_questions, percentage, details, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param("ssiidss", $email, $exam_type, $score, $total_questions, $percentage, $details, $submitted_at);
        if ($stmt->execute()) {
            $synced_count++;
        } else {
            error_log("Failed to execute sync statement for email: $email, error: " . $stmt->error);
        }
        $stmt->close();
    } else {
        error_log("Failed to prepare sync statement: " . $db->error);
    }
}

echo json_encode([
    "success" => true,
    "message" => "Successfully synchronized " . $synced_count . " exam results with the cloud.",
    "synced_count" => $synced_count
]);
