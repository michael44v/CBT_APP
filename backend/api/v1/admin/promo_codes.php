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

if ($method === 'GET') {
    $res = $db->query("SELECT * FROM promo_codes ORDER BY created_at DESC");
    $promos = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "promo_codes" => $promos]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? 'create');

    if ($action === 'toggle') {
        $id = intval($data['id'] ?? 0);
        $active = intval($data['active'] ?? 1);
        $stmt = $db->prepare("UPDATE promo_codes SET active = ? WHERE id = ?");
        $stmt->bind_param("ii", $active, $id);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Promo code status updated."]);
        exit();
    }

    if ($action === 'delete') {
        $id = intval($data['id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM promo_codes WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Promo code deleted successfully."]);
        exit();
    }

    $code = strtoupper(trim($data['code'] ?? ''));
    $discount_type = trim($data['discount_type'] ?? 'percentage'); // 'percentage' | 'fixed' | 'free'
    $discount_value = isset($data['discount_value']) ? floatval($data['discount_value']) : null;
    $max_uses = intval($data['max_uses'] ?? 100);
    $expires_at = !empty($data['expires_at']) ? trim($data['expires_at']) : null;

    if (empty($code)) {
        echo json_encode(["success" => false, "message" => "Promo Code string is required."]);
        exit();
    }

    $stmt = $db->prepare("INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, expires_at, active) VALUES (?, ?, ?, ?, ?, 1)");
    $stmt->bind_param("ssdis", $code, $discount_type, $discount_value, $max_uses, $expires_at);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Promo code created successfully."]);
    } else {
        echo json_encode(["success" => false, "message" => $db->error ?: "Failed to create promo code."]);
    }
    exit();
}
