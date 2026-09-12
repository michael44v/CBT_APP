<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../db.php';

// Helper function to verify JWT Bearer Token for admin actions
function verifyAdminAuthToken() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    $secret = getenv('JWT_SECRET') ?: 'fillop_jwt_admin_secret_key_2026';
    $validSignature = base64_encode(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret, true));

    if (!hash_equals($validSignature, $parts[2])) {
        return null;
    }

    $payload = json_decode(base64_decode($parts[1]), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) {
        return null;
    }

    return $payload;
}

$db = getDbConnection();

// Ensure required columns exist on admin_users and questions tables gracefully
try { @$db->query("ALTER TABLE questions ADD COLUMN created_by int(11) DEFAULT NULL"); } catch (Throwable $e) {}
try { @$db->query("ALTER TABLE admin_users ADD COLUMN full_name varchar(100) DEFAULT NULL"); } catch (Throwable $e) {}
try { @$db->query("ALTER TABLE admin_users ADD COLUMN plain_password varchar(255) DEFAULT NULL"); } catch (Throwable $e) {}
try { @$db->query("ALTER TABLE admin_users ADD COLUMN permissions text DEFAULT NULL"); } catch (Throwable $e) {}
try { @$db->query("ALTER TABLE admin_users ADD COLUMN status varchar(20) DEFAULT 'active'"); } catch (Throwable $e) {}

$authPayload = verifyAdminAuthToken();
if (!$authPayload) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized: Authentication required."]);
    exit();
}

$currentRole = strtolower(trim($authPayload['role'] ?? 'admin'));
$currentUserId = intval($authPayload['sub'] ?? 0);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Only super admin / admin role can view worker management
    if ($currentRole === 'worker') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "Access denied: Only Super Admins can access worker management."]);
        exit();
    }

    // Fetch all admin_users
    $res = $db->query("SELECT id, username, email, full_name, role, plain_password, permissions, status, created_at FROM admin_users ORDER BY id DESC");
    $users = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    // Attach question counts for each worker
    $workers = [];
    foreach ($users as $u) {
        $uId = intval($u['id']);
        $qCountStmt = $db->prepare("SELECT COUNT(*) as cnt FROM questions WHERE created_by = ?");
        $qCountStmt->bind_param("i", $uId);
        $qCountStmt->execute();
        $qCountRes = $qCountStmt->get_result()->fetch_assoc();
        $u['uploaded_questions_count'] = intval($qCountRes['cnt'] ?? 0);

        // Also count rows imported from upload logs if admin_user_id was set
        $logStmt = $db->prepare("SELECT SUM(rows_imported) as total_csv FROM question_upload_logs WHERE admin_user_id = ?");
        $logStmt->bind_param("i", $uId);
        $logStmt->execute();
        $logRes = $logStmt->get_result()->fetch_assoc();
        $u['csv_uploaded_count'] = intval($logRes['total_csv'] ?? 0);

        // Parse permissions JSON if set
        if (!empty($u['permissions'])) {
            $u['permissions_parsed'] = json_decode($u['permissions'], true);
        } else {
            // Default full permissions for admins, default worker permissions for worker
            $u['permissions_parsed'] = [
                'can_upload_csv' => true,
                'can_use_gui_builder' => true,
                'can_manage_subjects_topics' => true,
                'can_edit_questions' => true,
                'can_delete_questions' => ($u['role'] !== 'worker')
            ];
        }

        $workers[] = $u;
    }

    echo json_encode(["success" => true, "workers" => $workers]);
    exit();
}

if ($method === 'POST') {
    if ($currentRole === 'worker') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "Access denied: Only Super Admins can modify worker accounts."]);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $action = trim($data['action'] ?? '');

    if ($action === 'create_worker') {
        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $full_name = trim($data['full_name'] ?? '');
        $role = trim($data['role'] ?? 'worker');
        $permissions = $data['permissions'] ?? null;

        if (empty($username)) {
            $username = explode('@', $email)[0] ?? 'worker_' . rand(100, 999);
        }

        if (empty($email) || empty($password)) {
            echo json_encode(["success" => false, "message" => "Email and Password are required."]);
            exit();
        }

        // Check duplicate email or username
        $stmtCheck = $db->prepare("SELECT id FROM admin_users WHERE email = ? OR username = ? LIMIT 1");
        $stmtCheck->bind_param("ss", $email, $username);
        $stmtCheck->execute();
        if ($stmtCheck->get_result()->fetch_assoc()) {
            echo json_encode(["success" => false, "message" => "An account with this email or username already exists."]);
            exit();
        }

        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        $permsJson = is_array($permissions) ? json_encode($permissions) : json_encode([
            'can_upload_csv' => true,
            'can_use_gui_builder' => true,
            'can_manage_subjects_topics' => true,
            'can_edit_questions' => true,
            'can_delete_questions' => false
        ]);

        $stmtIns = $db->prepare("INSERT INTO admin_users (username, email, password_hash, role, full_name, plain_password, permissions, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')");
        $stmtIns->bind_param("sssssss", $username, $email, $password_hash, $role, $full_name, $password, $permsJson);
        $stmtIns->execute();

        echo json_encode(["success" => true, "worker_id" => $db->insert_id, "message" => "Worker account created successfully."]);
        exit();
    }

    if ($action === 'update_worker' || $action === 'edit_privileges') {
        $worker_id = intval($data['id'] ?? 0);
        $full_name = trim($data['full_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $role = trim($data['role'] ?? '');
        $status = trim($data['status'] ?? '');
        $permissions = $data['permissions'] ?? null;

        if ($worker_id <= 0) {
            echo json_encode(["success" => false, "message" => "Valid worker ID is required."]);
            exit();
        }

        // Fetch current worker
        $stmtCur = $db->prepare("SELECT * FROM admin_users WHERE id = ?");
        $stmtCur->bind_param("i", $worker_id);
        $stmtCur->execute();
        $curUser = $stmtCur->get_result()->fetch_assoc();

        if (!$curUser) {
            echo json_encode(["success" => false, "message" => "Worker user not found."]);
            exit();
        }

        $new_email = !empty($email) ? $email : $curUser['email'];
        $new_fullname = $full_name !== '' ? $full_name : $curUser['full_name'];
        $new_role = !empty($role) ? $role : $curUser['role'];
        $new_status = !empty($status) ? $status : $curUser['status'];

        $new_plainpass = $curUser['plain_password'];
        $new_hash = $curUser['password_hash'];
        if (!empty($password)) {
            $new_plainpass = $password;
            $new_hash = password_hash($password, PASSWORD_BCRYPT);
        }

        $new_perms = $curUser['permissions'];
        if (is_array($permissions)) {
            $new_perms = json_encode($permissions);
        }

        $stmtUpd = $db->prepare("UPDATE admin_users SET email = ?, full_name = ?, role = ?, status = ?, plain_password = ?, password_hash = ?, permissions = ? WHERE id = ?");
        $stmtUpd->bind_param("sssssssi", $new_email, $new_fullname, $new_role, $new_status, $new_plainpass, $new_hash, $new_perms, $worker_id);
        $stmtUpd->execute();

        echo json_encode(["success" => true, "message" => "Worker privileges and account updated successfully."]);
        exit();
    }

    if ($action === 'delete_worker') {
        $worker_id = intval($data['id'] ?? 0);

        if ($worker_id <= 0) {
            echo json_encode(["success" => false, "message" => "Valid worker ID is required."]);
            exit();
        }

        if ($worker_id === $currentUserId) {
            echo json_encode(["success" => false, "message" => "You cannot delete your own active super admin account."]);
            exit();
        }

        $stmtDel = $db->prepare("DELETE FROM admin_users WHERE id = ?");
        $stmtDel->bind_param("i", $worker_id);
        $stmtDel->execute();

        echo json_encode(["success" => true, "message" => "Worker account deleted successfully."]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
