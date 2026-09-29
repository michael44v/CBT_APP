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
    $search = trim($_GET['search'] ?? '');
    if (!empty($search)) {
        $search_term = "%" . $search . "%";
        $stmt = $db->prepare("SELECT * FROM users WHERE name LIKE ? OR email LIKE ? OR school LIKE ? ORDER BY created_at DESC");
        $stmt->bind_param("sss", $search_term, $search_term, $search_term);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $db->query("SELECT * FROM users ORDER BY created_at DESC");
    }

    $users = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "users" => $users]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? '');
    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Email parameter is required."]);
        exit();
    }

    if ($action === 'suspend' || $action === 'reactivate' || $action === 'admin_update_user_status') {
        $status = trim($data['status'] ?? '');
        if (empty($status)) {
            $status = ($action === 'suspend') ? 'suspended' : 'active';
        }

        // Update passcodes status for email
        $stmt = $db->prepare("UPDATE passcodes SET status = ? WHERE email = ?");
        $stmt->bind_param("ss", $status, $email);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "User passcodes set to " . $status . " successfully.", "status" => $status]);
        exit();
    }

    if ($action === 'update_profile_picture') {
        $profile_picture = trim($data['profile_picture'] ?? '');
        if (empty($profile_picture)) {
            echo json_encode(["success" => false, "message" => "Profile picture URL is required."]);
            exit();
        }
        $stmt = $db->prepare("UPDATE users SET profile_picture = ? WHERE email = ?");
        $stmt->bind_param("ss", $profile_picture, $email);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Profile picture updated successfully.", "profile_picture" => $profile_picture]);
        exit();
    }

    if ($action === 'update_user' || $action === 'edit_user') {
        $user_id = intval($data['id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $school = trim($data['school'] ?? '');
        $profile_picture = trim($data['profile_picture'] ?? '');

        if ($user_id > 0 && !empty($name)) {
            if (!empty($profile_picture)) {
                $stmt = $db->prepare("UPDATE users SET name = ?, phone = ?, school = ?, profile_picture = ? WHERE id = ?");
                $stmt->bind_param("ssssi", $name, $phone, $school, $profile_picture, $user_id);
            } else {
                $stmt = $db->prepare("UPDATE users SET name = ?, phone = ?, school = ? WHERE id = ?");
                $stmt->bind_param("sssi", $name, $phone, $school, $user_id);
            }
            $stmt->execute();
            echo json_encode(["success" => true, "message" => "Candidate details updated successfully."]);
            exit();
        }
        echo json_encode(["success" => false, "message" => "Invalid parameters for candidate update."]);
        exit();
    }

    if ($action === 'admin_delete_user') {
        $user_id = intval($data['id'] ?? 0);

        if ($user_id > 0) {
            $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
        } else if (!empty($email)) {
            $stmt = $db->prepare("DELETE FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
        } else {
            echo json_encode(["success" => false, "message" => "User ID or email is required for deletion."]);
            exit();
        }

        echo json_encode(["success" => true, "message" => "Candidate account deleted successfully."]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
