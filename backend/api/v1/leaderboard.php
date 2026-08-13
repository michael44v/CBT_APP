<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../db/db.php';

$db = getDbConnection();

// Try to fetch weekly top performers (last 7 days)
$sql = "SELECT
            email,
            COUNT(*) as total_exams,
            SUM(score) as total_correct,
            SUM(total_questions) as total_questions,
            MAX(percentage) as highest_percentage,
            AVG(percentage) as average_percentage,
            MAX(exam_type) as exam_type,
            MAX(submitted_at) as last_active
        FROM results
        WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY email
        ORDER BY average_percentage DESC, total_correct DESC
        LIMIT 10";

$res = $db->query($sql);
$leaderboard = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

$is_all_time = false;

// Fallback to all-time leaderboard if weekly is empty (to ensure board is never empty during testing)
if (count($leaderboard) === 0) {
    $sql_all_time = "SELECT
            email,
            COUNT(*) as total_exams,
            SUM(score) as total_correct,
            SUM(total_questions) as total_questions,
            MAX(percentage) as highest_percentage,
            AVG(percentage) as average_percentage,
            MAX(exam_type) as exam_type,
            MAX(submitted_at) as last_active
        FROM results
        GROUP BY email
        ORDER BY average_percentage DESC, total_correct DESC
        LIMIT 10";
    $res_all_time = $db->query($sql_all_time);
    $leaderboard = $res_all_time ? $res_all_time->fetch_all(MYSQLI_ASSOC) : [];
    $is_all_time = true;
}

echo json_encode([
    "success" => true,
    "leaderboard" => $leaderboard,
    "is_all_time" => $is_all_time,
    "timeframe" => $is_all_time ? "All-Time" : "This Week"
]);
