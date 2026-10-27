<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../db.php';

$db = getDbConnection();
$data = json_decode(file_get_contents("php://input"), true) ?: $_POST;

$action = trim($data['action'] ?? '');

if ($action === 'login') {
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if (empty($username) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Username and password are required."]);
        exit();
    }

    $stmt = $db->prepare("SELECT * FROM admin_users WHERE username = ? OR email = ? LIMIT 1");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $admin = $res->fetch_assoc();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        // Generate token header payload
        $header = base64_encode(json_encode(["alg" => "HS256", "typ" => "JWT"]));
        $payload = base64_encode(json_encode([
            "sub" => $admin['id'],
            "username" => $admin['username'],
            "email" => $admin['email'],
            "role" => $admin['role'] ?: 'admin',
            "iat" => time(),
            "exp" => time() + (86400 * 7) // 24 days
        ]));
        $secret = getenv('JWT_SECRET') ?: 'fillop_jwt_admin_secret_key_2026';
        $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
        $token = "$header.$payload.$signature";

        echo json_encode([
            "success" => true,
            "message" => "Login successful.",
            "token" => $token,
            "user" => [
                "id" => $admin['id'],
                "username" => $admin['username'],
                "email" => $admin['email'],
                "role" => $admin['role']
            ]
        ]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Invalid admin username or password."]);
    exit();
}

echo json_encode(["success" => false, "message" => "Invalid auth action."]);
exit();
