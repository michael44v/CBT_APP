<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../db/db.php';

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $res = $db->query("SELECT p.*, o.name as organization_name FROM passcodes p LEFT JOIN organizations o ON p.organization_id = o.id ORDER BY p.created_at DESC");
    $passcodes = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "passcodes" => $passcodes]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? 'generate');

    if ($action === 'generate') {
        $email = trim($data['email'] ?? 'admin@filloptech.com');
        $max_devices = intval($data['max_devices'] ?? 1);
        $duration_days = intval($data['duration_days'] ?? 180);
        $org_name = trim($data['organization_name'] ?? '');
        $exam_category = strtoupper(trim($data['exam_category'] ?? 'ALL'));
        $allowed_subjects = is_array($data['allowed_subjects'] ?? null) ? implode(',', $data['allowed_subjects']) : trim($data['allowed_subjects'] ?? '');

        $org_id = null;
        if (!empty($org_name)) {
            $stmt = $db->prepare("SELECT id FROM organizations WHERE name = ?");
            $stmt->bind_param("s", $org_name);
            $stmt->execute();
            $org_res = $stmt->get_result()->fetch_assoc();

            if ($org_res) {
                $org_id = $org_res['id'];
            } else {
                $stmt = $db->prepare("INSERT INTO organizations (name) VALUES (?)");
                $stmt->bind_param("s", $org_name);
                $stmt->execute();
                $org_id = $db->insert_id;
            }
        }

        $passcode = 'GP-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));

        $stmt = $db->prepare("INSERT INTO passcodes (passcode, email, organization_id, exam_category, allowed_subjects, max_devices, duration_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')");
        $stmt->bind_param("ssissii", $passcode, $email, $org_id, $exam_category, $allowed_subjects, $max_devices, $duration_days);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Passcode generated successfully.",
            "passcode" => [
                "passcode" => $passcode,
                "email" => $email,
                "exam_category" => $exam_category,
                "allowed_subjects" => $allowed_subjects,
                "max_devices" => $max_devices,
                "duration_days" => $duration_days,
                "status" => "active"
            ]
        ]);
        exit();
    }

    if ($action === 'update_subjects') {
        $passcode_val = trim($data['passcode'] ?? '');
        $exam_category = strtoupper(trim($data['exam_category'] ?? 'ALL'));
        $allowed_subjects = is_array($data['allowed_subjects'] ?? null) ? implode(',', $data['allowed_subjects']) : trim($data['allowed_subjects'] ?? '');

        $stmt = $db->prepare("UPDATE passcodes SET exam_category = ?, allowed_subjects = ? WHERE passcode = ?");
        $stmt->bind_param("sss", $exam_category, $allowed_subjects, $passcode_val);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Subject allocations updated successfully for $passcode_val."]);
        exit();
    }

    if ($action === 'revoke') {
        $passcode_val = trim($data['passcode'] ?? '');
        $stmt = $db->prepare("UPDATE passcodes SET status = 'suspended' WHERE passcode = ?");
        $stmt->bind_param("s", $passcode_val);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Passcode suspended/revoked successfully."]);
        exit();
    }

    if ($action === 'extend') {
        $passcode_val = trim($data['passcode'] ?? '');
        $days = intval($data['days'] ?? 30);

        $stmt = $db->prepare("SELECT id, expires_at, duration_days FROM passcodes WHERE passcode = ?");
        $stmt->bind_param("s", $passcode_val);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if ($row) {
            if (!empty($row['expires_at'])) {
                $new_expiry = date('Y-m-d H:i:s', strtotime($row['expires_at']) + ($days * 86400));
            } else {
                $new_expiry = date('Y-m-d H:i:s', time() + (($row['duration_days'] + $days) * 86400));
            }

            $stmt = $db->prepare("UPDATE passcodes SET expires_at = ?, duration_days = duration_days + ? WHERE passcode = ?");
            $stmt->bind_param("sis", $new_expiry, $days, $passcode_val);
            $stmt->execute();

            echo json_encode(["success" => true, "message" => "Passcode subscription extended by " . $days . " days."]);
            exit();
        }
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
