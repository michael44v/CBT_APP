<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../db.php';

$db = getDbConnection();

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

// Software / DB update settings & notifications
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

echo json_encode([
    "success" => true,
    "subjects" => $subjects,
    "topics" => $topics,
    "questions" => $questions,
    "news" => $news,
    "settings" => $settings
]);
