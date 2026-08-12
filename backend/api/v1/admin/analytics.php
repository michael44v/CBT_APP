<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../db/db.php';

$db = getDbConnection();

// Users Count
$res = $db->query("SELECT COUNT(*) as count FROM users");
$total_users = $res ? $res->fetch_assoc()['count'] : 0;

// Passcodes Count
$res = $db->query("SELECT COUNT(*) as count FROM passcodes WHERE status = 'active'");
$active_passcodes = $res ? $res->fetch_assoc()['count'] : 0;

$res = $db->query("SELECT COUNT(*) as count FROM passcodes WHERE status = 'suspended'");
$suspended_passcodes = $res ? $res->fetch_assoc()['count'] : 0;

// Estimated Revenue
// We can sum max_devices * price or count existing records
$res = $db->query("SELECT SUM(max_devices * 1200) as rev FROM passcodes");
$estimated_revenue = $res ? floatval($res->fetch_assoc()['rev'] ?? 0) : 0;

// Popular subjects and questions count
$res = $db->query("SELECT COUNT(*) as count FROM questions");
$total_questions = $res ? $res->fetch_assoc()['count'] : 0;

// Promo Codes Usage
$res = $db->query("SELECT COUNT(*) as count FROM promo_codes");
$total_promos = $res ? $res->fetch_assoc()['count'] : 0;

echo json_encode([
    "success" => true,
    "analytics" => [
        "total_users" => intval($total_users),
        "active_passcodes" => intval($active_passcodes),
        "suspended_passcodes" => intval($suspended_passcodes),
        "estimated_revenue" => $estimated_revenue,
        "total_questions" => intval($total_questions),
        "total_promos" => intval($total_promos)
    ]
]);
