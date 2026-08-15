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

// Pull all subjects
$subjects_res = $db->query("SELECT * FROM subjects");
$subjects = $subjects_res ? $subjects_res->fetch_all(MYSQLI_ASSOC) : [];

// Pull all topics
$topics_res = $db->query("SELECT * FROM topics");
$topics = $topics_res ? $topics_res->fetch_all(MYSQLI_ASSOC) : [];

// Pull all questions
$questions_res = $db->query("SELECT * FROM questions");
$questions = $questions_res ? $questions_res->fetch_all(MYSQLI_ASSOC) : [];

// Pull all news
$news_res = $db->query("SELECT * FROM news ORDER BY created_at DESC");
$news = $news_res ? $news_res->fetch_all(MYSQLI_ASSOC) : [];

$settings = [
    "latest_version" => "1.0.0",
    "download_url" => "https://filloptech.com/downloads/cbt-guru-installer.exe",
    "question_bank_version" => 1,
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
    "subjects" => $subjects,
    "topics" => $topics,
    "questions" => $questions,
    "news" => $news,
    "settings" => $settings
];

if ($passcode_info !== null) {
    $response["passcode_info"] = $passcode_info;
}

echo json_encode($response);
