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

function generateUniquePasscode() {
    return 'GP-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));
}

if ($method === 'GET') {
    $res = $db->query("SELECT p.*, o.name as organization_name, o.type as organization_type, o.contact_person, o.contact_email, o.contact_phone FROM passcodes p LEFT JOIN organizations o ON p.organization_id = o.id ORDER BY p.created_at DESC");
    $passcodes = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $org_res = $db->query("SELECT o.*, COUNT(p.id) as passcode_count FROM organizations o LEFT JOIN passcodes p ON o.id = p.organization_id GROUP BY o.id ORDER BY o.created_at DESC");
    $organizations = $org_res ? $org_res->fetch_all(MYSQLI_ASSOC) : [];

    $upg_res = $db->query("SELECT * FROM passcode_upgrades ORDER BY created_at DESC");
    $upgrades = $upg_res ? $upg_res->fetch_all(MYSQLI_ASSOC) : [];

    echo json_encode([
        "success" => true,
        "passcodes" => $passcodes,
        "organizations" => $organizations,
        "upgrades" => $upgrades
    ]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? 'generate');

    if ($action === 'generate' || $action === 'bulk_generate') {
        $email = trim($data['email'] ?? 'admin@filloptech.com');
        $quantity = max(1, intval($data['quantity'] ?? 1));
        $max_devices = intval($data['max_devices'] ?? 1);
        $duration_days = intval($data['duration_days'] ?? 180);
        $org_name = trim($data['organization_name'] ?? '');
        $org_type = trim($data['organization_type'] ?? 'Secondary School');
        $contact_person = trim($data['contact_person'] ?? '');
        $contact_phone = trim($data['contact_phone'] ?? '');

        $exam_category = strtoupper(trim($data['exam_category'] ?? 'JAMB'));
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
                $stmt = $db->prepare("INSERT INTO organizations (name, type, contact_person, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("sssss", $org_name, $org_type, $contact_person, $email, $contact_phone);
                $stmt->execute();
                $org_id = $db->insert_id;
            }
        }

        $generated_passcodes = [];
        for ($i = 0; $i < $quantity; $i++) {
            $passcode = generateUniquePasscode();
            $stmt = $db->prepare("INSERT INTO passcodes (passcode, email, organization_id, exam_category, allowed_subjects, max_devices, duration_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')");
            $stmt->bind_param("ssissii", $passcode, $email, $org_id, $exam_category, $allowed_subjects, $max_devices, $duration_days);
            $stmt->execute();
            $generated_passcodes[] = $passcode;
        }

        echo json_encode([
            "success" => true,
            "message" => "Successfully generated $quantity passcode(s).",
            "quantity" => $quantity,
            "passcode" => [
                "passcode" => $generated_passcodes[0],
                "email" => $email,
                "exam_category" => $exam_category,
                "allowed_subjects" => $allowed_subjects,
                "max_devices" => $max_devices,
                "duration_days" => $duration_days,
                "status" => "active"
            ],
            "passcodes" => $generated_passcodes
        ]);
        exit();
    }

    if ($action === 'replace') {
        $old_passcode = trim($data['passcode'] ?? '');
        if (empty($old_passcode)) {
            echo json_encode(["success" => false, "message" => "Original passcode required for replacement."]);
            exit();
        }

        $stmt = $db->prepare("SELECT * FROM passcodes WHERE passcode = ?");
        $stmt->bind_param("s", $old_passcode);
        $stmt->execute();
        $old_row = $stmt->get_result()->fetch_assoc();

        if (!$old_row) {
            echo json_encode(["success" => false, "message" => "Passcode not found."]);
            exit();
        }

        // Suspend old passcode
        $stmt = $db->prepare("UPDATE passcodes SET status = 'suspended' WHERE passcode = ?");
        $stmt->bind_param("s", $old_passcode);
        $stmt->execute();

        // Create new replacement passcode
        $new_passcode = generateUniquePasscode();
        $stmt = $db->prepare("INSERT INTO passcodes (passcode, email, organization_id, exam_category, allowed_subjects, max_devices, duration_days, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)");
        $stmt->bind_param("ssissiis", $new_passcode, $old_row['email'], $old_row['organization_id'], $old_row['exam_category'], $old_row['allowed_subjects'], $old_row['max_devices'], $old_row['duration_days'], $old_row['expires_at']);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Passcode $old_passcode replaced successfully with $new_passcode.",
            "old_passcode" => $old_passcode,
            "new_passcode" => $new_passcode
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

    if ($action === 'create_organization') {
        $name = trim($data['name'] ?? '');
        $type = trim($data['type'] ?? 'Secondary School');
        $contact_person = trim($data['contact_person'] ?? '');
        $contact_email = trim($data['contact_email'] ?? '');
        $contact_phone = trim($data['contact_phone'] ?? '');

        if (empty($name)) {
            echo json_encode(["success" => false, "message" => "Organization name is required."]);
            exit();
        }

        $stmt = $db->prepare("INSERT INTO organizations (name, type, contact_person, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $name, $type, $contact_person, $contact_email, $contact_phone);
        $stmt->execute();

        echo json_encode([
            "success" => true,
            "message" => "Institutional account created successfully.",
            "organization_id" => $db->insert_id
        ]);
        exit();
    }

    if ($action === 'approve_upgrade') {
        $upgrade_id = intval($data['upgrade_id'] ?? 0);
        $stmt = $db->prepare("SELECT * FROM passcode_upgrades WHERE id = ?");
        $stmt->bind_param("i", $upgrade_id);
        $stmt->execute();
        $upg = $stmt->get_result()->fetch_assoc();

        if (!$upg) {
            echo json_encode(["success" => false, "message" => "Upgrade request not found."]);
            exit();
        }

        // Apply new categories and subjects to passcode
        $u_stmt = $db->prepare("UPDATE passcodes SET exam_category = ?, allowed_subjects = ? WHERE id = ?");
        $u_stmt->bind_param("ssi", $upg['new_categories'], $upg['new_subjects'], $upg['passcode_id']);
        $u_stmt->execute();

        // Mark upgrade status as approved
        $status_stmt = $db->prepare("UPDATE passcode_upgrades SET status = 'approved' WHERE id = ?");
        $status_stmt->bind_param("i", $upgrade_id);
        $status_stmt->execute();

        echo json_encode(["success" => true, "message" => "Upgrade request approved and passcode updated successfully!"]);
        exit();
    }

    if ($action === 'reject_upgrade') {
        $upgrade_id = intval($data['upgrade_id'] ?? 0);
        $notes = trim($data['admin_notes'] ?? 'Rejected by administrator');

        $status_stmt = $db->prepare("UPDATE passcode_upgrades SET status = 'rejected', admin_notes = ? WHERE id = ?");
        $status_stmt->bind_param("si", $notes, $upgrade_id);
        $status_stmt->execute();

        echo json_encode(["success" => true, "message" => "Upgrade request rejected."]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
