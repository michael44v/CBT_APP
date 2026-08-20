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

$email = trim($_GET['email'] ?? $_POST['email'] ?? '');
$passcode = trim($_GET['passcode'] ?? $_POST['passcode'] ?? '');
$since_version = intval($_GET['since'] ?? $_POST['since'] ?? 0);

$passcode_info = null;
if (!empty($email) && !empty($passcode)) {
    $stmt = $db->prepare("SELECT * FROM passcodes WHERE passcode = ? AND email = ?");
    $stmt->bind_param("ss", $passcode, $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $p_row = $res->fetch_assoc();
    if ($p_row) {
        $passcode_info = [
            "exam_category" => $p_row['exam_category'] ?? 'ALL',
            "allowed_subjects" => $p_row['allowed_subjects'] ?? '',
            "expires_at" => $p_row['expires_at'],
            "status" => $p_row['status']
        ];
    }
}

// Get current central server sync version from sync_sequence
$seq_res = $db->query("SELECT current_version FROM sync_sequence WHERE id = 1");
$current_server_version = 1;
if ($seq_res && $seq_row = $seq_res->fetch_assoc()) {
    $current_server_version = intval($seq_row['current_version']);
}

// Pull delta subjects
$subjects = [];
if ($since_version <= 0) {
    $subjects_res = $db->query("SELECT * FROM subjects");
    $subjects = $subjects_res ? $subjects_res->fetch_all(MYSQLI_ASSOC) : [];
} else {
    $stmtSub = $db->prepare("SELECT * FROM subjects WHERE sync_version > ?");
    $stmtSub->bind_param("i", $since_version);
    $stmtSub->execute();
    $resSub = $stmtSub->get_result();
    $subjects = $resSub ? $resSub->fetch_all(MYSQLI_ASSOC) : [];
}

// Pull delta topics
$topics = [];
if ($since_version <= 0) {
    $topics_res = $db->query("SELECT * FROM topics");
    $topics = $topics_res ? $topics_res->fetch_all(MYSQLI_ASSOC) : [];
} else {
    $stmtTop = $db->prepare("SELECT * FROM topics WHERE sync_version > ?");
    $stmtTop->bind_param("i", $since_version);
    $stmtTop->execute();
    $resTop = $stmtTop->get_result();
    $topics = $resTop ? $resTop->fetch_all(MYSQLI_ASSOC) : [];
}

// Pull delta questions
$questions = [];
if ($since_version <= 0) {
    $questions_res = $db->query("SELECT * FROM questions");
    $questions = $questions_res ? $questions_res->fetch_all(MYSQLI_ASSOC) : [];
} else {
    $stmtQ = $db->prepare("SELECT * FROM questions WHERE sync_version > ?");
    $stmtQ->bind_param("i", $since_version);
    $stmtQ->execute();
    $resQ = $stmtQ->get_result();
    $questions = $resQ ? $resQ->fetch_all(MYSQLI_ASSOC) : [];
}

// Pull deleted question IDs since $since_version
$deleted_question_ids = [];
if ($since_version > 0) {
    $stmtDel = $db->prepare("SELECT question_id FROM deleted_questions WHERE sync_version > ?");
    $stmtDel->bind_param("i", $since_version);
    $stmtDel->execute();
    $resDel = $stmtDel->get_result();
    if ($resDel) {
        while ($rowDel = $resDel->fetch_assoc()) {
            $deleted_question_ids[] = intval($rowDel['question_id']);
        }
    }
}

// Pull news
$news_res = $db->query("SELECT * FROM news ORDER BY created_at DESC");
$news = $news_res ? $news_res->fetch_all(MYSQLI_ASSOC) : [];

$settings = [
    "latest_version" => "1.0.0",
    "download_url" => "https://filloptech.com/downloads/cbt-guru-installer.exe",
    "question_bank_version" => $current_server_version,
    "notifications" => [
        [
            "id" => 1,
            "title" => "Welcome to Fillop CBT Guru!",
            "message" => "Prepare fully offline for your JAMB, WAEC, or NECO exams. All practice modes are active.",
            "created_at" => date('c')
        ]
    ]
];

$response = [
    "success" => true,
    "server_version" => $current_server_version,
    "is_full_sync" => ($since_version <= 0),
    "subjects" => $subjects,
    "topics" => $topics,
    "questions" => $questions,
    "deleted_question_ids" => $deleted_question_ids,
    "news" => $news,
    "settings" => $settings
];

if ($passcode_info !== null) {
    $response["passcode_info"] = $passcode_info;
}

echo json_encode($response);
