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

    // Map usages from promo_code_usages table
    $usagesMap = [];
    $resUsages = $db->query("SELECT pu.*, u.name as user_full_name FROM promo_code_usages pu LEFT JOIN users u ON pu.user_email = u.email ORDER BY pu.used_at DESC");
    if ($resUsages) {
        while ($uRow = $resUsages->fetch_assoc()) {
            $codeKey = strtoupper($uRow['promo_code']);
            if (!isset($usagesMap[$codeKey])) {
                $usagesMap[$codeKey] = [];
            }
            $usagesMap[$codeKey][] = [
                'user_email' => $uRow['user_email'],
                'user_name' => !empty($uRow['user_name']) ? $uRow['user_name'] : (!empty($uRow['user_full_name']) ? $uRow['user_full_name'] : 'Candidate'),
                'passcode' => $uRow['passcode'] ?? 'N/A',
                'discount_amount' => floatval($uRow['discount_amount'] ?? 0),
                'used_at' => $uRow['used_at']
            ];
        }
    }

    // Map usages from passcode_upgrades table as additional source
    $resDeductions = $db->query("SELECT pu.*, u.name as user_full_name FROM passcode_upgrades pu LEFT JOIN users u ON pu.email = u.email WHERE pu.admin_notes LIKE '%Promo%' ORDER BY pu.created_at DESC");
    $totalDeductionsMap = [];
    if ($resDeductions) {
        while ($row = $resDeductions->fetch_assoc()) {
            if (preg_match('/Promo:\s*([A-Z0-9_\-]+)(?:.*?Savings:\s*([0-9\.]+))?/i', $row['admin_notes'], $matches)) {
                $pCode = strtoupper($matches[1]);
                $sav = isset($matches[2]) ? floatval($matches[2]) : 0;
                $totalDeductionsMap[$pCode] = ($totalDeductionsMap[$pCode] ?? 0) + $sav;

                if (!isset($usagesMap[$pCode])) {
                    $usagesMap[$pCode] = [];
                }
                // Check if already in usagesMap to avoid duplicates
                $alreadyLogged = false;
                foreach ($usagesMap[$pCode] as $existing) {
                    if ($existing['user_email'] === $row['email'] && $existing['passcode'] === $row['passcode']) {
                        $alreadyLogged = true;
                        break;
                    }
                }
                if (!$alreadyLogged) {
                    $usagesMap[$pCode][] = [
                        'user_email' => $row['email'],
                        'user_name' => !empty($row['user_full_name']) ? $row['user_full_name'] : 'Candidate',
                        'passcode' => $row['passcode'],
                        'discount_amount' => $sav,
                        'used_at' => $row['created_at']
                    ];
                }
            }
        }
    }

    foreach ($promos as &$p) {
        $c = strtoupper($p['code']);
        $p['total_discount_deducted'] = $totalDeductionsMap[$c] ?? 0;
        $p['redemptions'] = $usagesMap[$c] ?? [];
        if (empty($p['uses_count'])) {
            $p['uses_count'] = count($p['redemptions']);
        }
    }

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
