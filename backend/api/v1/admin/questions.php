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
function verifyAdminAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    $payload = json_decode(base64_decode($parts[1]), true);
    if (!$payload || ($payload['exp'] ?? 0) < time() || ($payload['role'] ?? '') !== 'admin') {
        return null;
    }

    return $payload;
}

$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Enforce auth check on POST actions
if ($method === 'POST') {
    $authPayload = verifyAdminAuth();
    // Allow login or check bearer token
    if (!$authPayload) {
        // Return error if unauthenticated
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized: Admin authentication required."]);
        exit();
    }
}

// Helper function to bump sync_version in sync_sequence
function bumpSyncVersion($db) {
    $db->query("UPDATE sync_sequence SET current_version = current_version + 1 WHERE id = 1");
    $verRes = $db->query("SELECT current_version FROM sync_sequence WHERE id = 1");
    return ($verRes && $verRow = $verRes->fetch_assoc()) ? intval($verRow['current_version']) : 1;
}

if ($method === 'GET') {
    $exam_type = trim($_GET['exam_type'] ?? '');
    $subject_id = trim($_GET['subject_id'] ?? '');
    $topic_id = trim($_GET['topic_id'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $action = trim($_GET['action'] ?? '');

    if ($action === 'list_subjects') {
        $sql = "SELECT s.*,
                    (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id) as topic_count,
                    (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) as question_count
                FROM subjects s";
        if (!empty($exam_type)) {
            $stmt = $db->prepare($sql . " WHERE s.exam_type = ? ORDER BY s.name");
            $stmt->bind_param("s", $exam_type);
            $stmt->execute();
            $res = $stmt->get_result();
        } else {
            $res = $db->query($sql . " ORDER BY s.exam_type, s.name");
        }
        $subjects = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
        echo json_encode(["success" => true, "subjects" => $subjects]);
        exit();
    }

    if ($action === 'list_topics') {
        if (empty($subject_id)) {
            echo json_encode(["success" => false, "message" => "subject_id is required for listing topics."]);
            exit();
        }
        $stmt = $db->prepare("SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as question_count FROM topics t WHERE t.subject_id = ? ORDER BY t.name");
        $subId = intval($subject_id);
        $stmt->bind_param("i", $subId);
        $stmt->execute();
        $res = $stmt->get_result();
        $topics = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
        echo json_encode(["success" => true, "topics" => $topics]);
        exit();
    }

    if ($action === 'upload_logs') {
        $res = $db->query("SELECT l.*, s.name as subject_name, t.name as topic_name
                          FROM question_upload_logs l
                          LEFT JOIN subjects s ON l.subject_id = s.id
                          LEFT JOIN topics t ON l.topic_id = t.id
                          ORDER BY l.id DESC LIMIT 100");
        $logs = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
        echo json_encode(["success" => true, "logs" => $logs]);
        exit();
    }

    // Default: GET questions listing
    $sql = "SELECT q.*, s.name as subject_name, t.name as topic_name
            FROM questions q
            LEFT JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN topics t ON q.topic_id = t.id";

    $conditions = [];
    $params = [];
    $types = "";

    if (!empty($exam_type)) {
        $conditions[] = "q.exam_type = ?";
        $params[] = $exam_type;
        $types .= "s";
    }

    if (!empty($subject_id)) {
        $conditions[] = "q.subject_id = ?";
        $params[] = intval($subject_id);
        $types .= "i";
    }

    if (!empty($topic_id)) {
        $conditions[] = "q.topic_id = ?";
        $params[] = intval($topic_id);
        $types .= "i";
    }

    if (!empty($search)) {
        $conditions[] = "q.question_text LIKE ?";
        $params[] = "%" . $search . "%";
        $types .= "s";
    }

    if (count($conditions) > 0) {
        $sql .= " WHERE " . implode(" AND ", $conditions) . " ORDER BY q.id DESC LIMIT 500";
        $stmt = $db->prepare($sql);
        if ($stmt) {
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $res = $stmt->get_result();
        } else {
            $res = false;
        }
    } else {
        $res = $db->query($sql . " ORDER BY q.id DESC LIMIT 500");
    }

    $questions = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "questions" => $questions]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $action = trim($data['action'] ?? '');

    if ($action === 'get_subjects_and_topics') {
        $subs_res = $db->query("SELECT s.*,
                                    (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id) as topic_count,
                                    (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id) as question_count
                                FROM subjects s ORDER BY s.exam_type, s.name");
        $subjects = $subs_res ? $subs_res->fetch_all(MYSQLI_ASSOC) : [];

        $tops_res = $db->query("SELECT t.*, (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id) as question_count FROM topics t ORDER BY t.name");
        $topics = $tops_res ? $tops_res->fetch_all(MYSQLI_ASSOC) : [];

        echo json_encode(["success" => true, "subjects" => $subjects, "topics" => $topics]);
        exit();
    }

    if ($action === 'create_subject') {
        $name = trim($data['name'] ?? '');
        $exam_type = strtoupper(trim($data['exam_type'] ?? ''));

        if (empty($name) || empty($exam_type)) {
            echo json_encode(["success" => false, "message" => "Subject name and exam_type are required."]);
            exit();
        }

        // Check unique constraint (name, exam_type)
        $stmtCheck = $db->prepare("SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) AND exam_type = ? LIMIT 1");
        $stmtCheck->bind_param("ss", $name, $exam_type);
        $stmtCheck->execute();
        if ($stmtCheck->get_result()->fetch_assoc()) {
            echo json_encode(["success" => false, "message" => "Subject '{$name}' already exists for category {$exam_type}."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmtIns = $db->prepare("INSERT INTO subjects (name, exam_type, sync_version) VALUES (?, ?, ?)");
        $stmtIns->bind_param("ssi", $name, $exam_type, $sync_version);
        $stmtIns->execute();

        echo json_encode(["success" => true, "subject_id" => $db->insert_id, "message" => "Subject created successfully."]);
        exit();
    }

    if ($action === 'create_topic') {
        $subject_id = intval($data['subject_id'] ?? 0);
        $topic_name = trim($data['topic_name'] ?? '');

        if ($subject_id <= 0 || empty($topic_name)) {
            echo json_encode(["success" => false, "message" => "Subject ID and topic_name are required."]);
            exit();
        }

        // Check case-insensitive duplicate
        $stmt = $db->prepare("SELECT id FROM topics WHERE subject_id = ? AND LOWER(name) = LOWER(?)");
        $stmt->bind_param("is", $subject_id, $topic_name);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res->fetch_assoc();

        if ($row) {
            echo json_encode(["success" => true, "topic_id" => intval($row['id']), "message" => "Topic already exists.", "warning" => "Topic with similar name exists."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmt = $db->prepare("INSERT INTO topics (subject_id, name, sync_version) VALUES (?, ?, ?)");
        $stmt->bind_param("isi", $subject_id, $topic_name, $sync_version);
        $stmt->execute();
        $new_topic_id = $db->insert_id;

        echo json_encode(["success" => true, "topic_id" => $new_topic_id, "message" => "Topic created successfully."]);
        exit();
    }

    if ($action === 'edit_topic') {
        $topic_id = intval($data['topic_id'] ?? 0);
        $name = trim($data['name'] ?? '');

        if ($topic_id <= 0 || empty($name)) {
            echo json_encode(["success" => false, "message" => "Valid topic_id and name are required."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmt = $db->prepare("UPDATE topics SET name = ?, sync_version = ? WHERE id = ?");
        $stmt->bind_param("sii", $name, $sync_version, $topic_id);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Topic updated successfully."]);
        exit();
    }

    if ($action === 'delete_topic') {
        $topic_id = intval($data['topic_id'] ?? 0);
        $reassign_topic_id = intval($data['reassign_topic_id'] ?? 0);

        if ($topic_id <= 0) {
            echo json_encode(["success" => false, "message" => "Valid topic_id is required."]);
            exit();
        }

        // Check if questions reference this topic
        $stmtQ = $db->prepare("SELECT COUNT(*) as cnt FROM questions WHERE topic_id = ?");
        $stmtQ->bind_param("i", $topic_id);
        $stmtQ->execute();
        $qCount = $stmtQ->get_result()->fetch_assoc()['cnt'] ?? 0;

        if ($qCount > 0) {
            if ($reassign_topic_id <= 0 || $reassign_topic_id === $topic_id) {
                echo json_encode([
                    "success" => false,
                    "has_questions" => true,
                    "question_count" => $qCount,
                    "message" => "Cannot delete topic because {$qCount} questions are associated with it. Select a target topic to reassign questions first."
                ]);
                exit();
            }

            // Verify reassign topic belongs to same subject
            $stmtSub1 = $db->prepare("SELECT subject_id FROM topics WHERE id = ?");
            $stmtSub1->bind_param("i", $topic_id);
            $stmtSub1->execute();
            $sub1 = $stmtSub1->get_result()->fetch_assoc()['subject_id'] ?? 0;

            $stmtSub2 = $db->prepare("SELECT subject_id FROM topics WHERE id = ?");
            $stmtSub2->bind_param("i", $reassign_topic_id);
            $stmtSub2->execute();
            $sub2 = $stmtSub2->get_result()->fetch_assoc()['subject_id'] ?? 0;

            if ($sub1 <= 0 || $sub1 !== $sub2) {
                echo json_encode(["success" => false, "message" => "Target reassign topic must belong to the same subject."]);
                exit();
            }

            // Reassign questions
            $sync_version = bumpSyncVersion($db);
            $stmtRe = $db->prepare("UPDATE questions SET topic_id = ?, sync_version = ? WHERE topic_id = ?");
            $stmtRe->bind_param("iii", $reassign_topic_id, $sync_version, $topic_id);
            $stmtRe->execute();
        }

        $stmtDel = $db->prepare("DELETE FROM topics WHERE id = ?");
        $stmtDel->bind_param("i", $topic_id);
        $stmtDel->execute();

        echo json_encode(["success" => true, "message" => "Topic deleted successfully."]);
        exit();
    }

    if ($action === 'create') {
        $exam_type = strtoupper(trim($data['exam_type'] ?? ''));
        $subject_id = intval($data['subject_id'] ?? 0);
        $subject_name = trim($data['subject_name'] ?? '');
        $year = intval($data['year'] ?? 0);
        $topic_id = intval($data['topic_id'] ?? 0);
        $topic_name = trim($data['topic_name'] ?? '');
        $difficulty = trim($data['difficulty'] ?? 'medium');
        $question_text = trim($data['question_text'] ?? '');
        $option_a = trim($data['option_a'] ?? '');
        $option_b = trim($data['option_b'] ?? '');
        $option_c = trim($data['option_c'] ?? '');
        $option_d = trim($data['option_d'] ?? '');
        $correct_answer = strtoupper(trim($data['correct_answer'] ?? ''));
        $topic_explanation = trim($data['topic_explanation'] ?? '');
        $correct_explanation = trim($data['correct_explanation'] ?? '');
        $wrong_explanations = trim($data['wrong_explanations'] ?? '');

        if ($subject_id <= 0 && !empty($subject_name)) {
            $stmt = $db->prepare("SELECT id FROM subjects WHERE exam_type = ? AND LOWER(name) = LOWER(?) LIMIT 1");
            $stmt->bind_param("ss", $exam_type, $subject_name);
            $stmt->execute();
            if ($row = $stmt->get_result()->fetch_assoc()) {
                $subject_id = intval($row['id']);
            }
        }

        if (empty($exam_type) || $subject_id <= 0 || empty($year) || empty($question_text) || !in_array($correct_answer, ['A','B','C','D'])) {
            echo json_encode(["success" => false, "message" => "Valid exam_type, subject, year, question_text, and correct_answer (A/B/C/D) are required."]);
            exit();
        }

        if ($topic_id <= 0 && !empty($topic_name)) {
            $stmt = $db->prepare("SELECT id FROM topics WHERE subject_id = ? AND LOWER(name) = LOWER(?) LIMIT 1");
            $stmt->bind_param("is", $subject_id, $topic_name);
            $stmt->execute();
            if ($row = $stmt->get_result()->fetch_assoc()) {
                $topic_id = intval($row['id']);
            } else {
                $sync_v = bumpSyncVersion($db);
                $stmtIns = $db->prepare("INSERT INTO topics (subject_id, name, sync_version) VALUES (?, ?, ?)");
                $stmtIns->bind_param("isi", $subject_id, $topic_name, $sync_v);
                $stmtIns->execute();
                $topic_id = $db->insert_id;
            }
        }

        $sync_version = bumpSyncVersion($db);
        $stmt = $db->prepare("INSERT INTO questions (exam_type, subject_id, year, topic_id, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, topic_explanation, correct_explanation, wrong_explanations, sync_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("siiissssssssssi", $exam_type, $subject_id, $year, $topic_id, $difficulty, $question_text, $option_a, $option_b, $option_c, $option_d, $correct_answer, $topic_explanation, $correct_explanation, $wrong_explanations, $sync_version);
        $stmt->execute();

        echo json_encode(["success" => true, "id" => $db->insert_id, "message" => "Question added successfully."]);
        exit();
    }

    if ($action === 'update') {
        $id = intval($data['id'] ?? 0);
        $exam_type = strtoupper(trim($data['exam_type'] ?? ''));
        $subject_id = intval($data['subject_id'] ?? 0);
        $year = intval($data['year'] ?? 0);
        $topic_id = intval($data['topic_id'] ?? 0);
        $difficulty = trim($data['difficulty'] ?? 'medium');
        $question_text = trim($data['question_text'] ?? '');
        $option_a = trim($data['option_a'] ?? '');
        $option_b = trim($data['option_b'] ?? '');
        $option_c = trim($data['option_c'] ?? '');
        $option_d = trim($data['option_d'] ?? '');
        $correct_answer = strtoupper(trim($data['correct_answer'] ?? ''));
        $topic_explanation = trim($data['topic_explanation'] ?? '');
        $correct_explanation = trim($data['correct_explanation'] ?? '');
        $wrong_explanations = trim($data['wrong_explanations'] ?? '');

        if ($id <= 0 || empty($exam_type) || $subject_id <= 0 || $topic_id <= 0 || empty($question_text) || !in_array($correct_answer, ['A','B','C','D'])) {
            echo json_encode(["success" => false, "message" => "Invalid parameters for editing question."]);
            exit();
        }

        // Verify topic_id belongs to subject_id
        $stmtCheckTop = $db->prepare("SELECT subject_id FROM topics WHERE id = ?");
        $stmtCheckTop->bind_param("i", $topic_id);
        $stmtCheckTop->execute();
        $topSub = $stmtCheckTop->get_result()->fetch_assoc()['subject_id'] ?? 0;
        if ($topSub !== $subject_id) {
            echo json_encode(["success" => false, "message" => "Topic must belong to the selected subject."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmt = $db->prepare("UPDATE questions SET exam_type=?, subject_id=?, year=?, topic_id=?, difficulty=?, question_text=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_answer=?, topic_explanation=?, correct_explanation=?, wrong_explanations=?, sync_version=? WHERE id=?");
        $stmt->bind_param("siiissssssssssii", $exam_type, $subject_id, $year, $topic_id, $difficulty, $question_text, $option_a, $option_b, $option_c, $option_d, $correct_answer, $topic_explanation, $correct_explanation, $wrong_explanations, $sync_version, $id);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Question updated successfully."]);
        exit();
    }

    if ($action === 'delete' || $action === 'admin_delete_question') {
        $id = intval($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(["success" => false, "message" => "Invalid question ID."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmtDel = $db->prepare("INSERT INTO deleted_questions (question_id, sync_version) VALUES (?, ?)");
        $stmtDel->bind_param("ii", $id, $sync_version);
        $stmtDel->execute();

        $stmt = $db->prepare("DELETE FROM questions WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Question deleted successfully."]);
        exit();
    }

    if ($action === 'bulk_delete') {
        $ids = $data['ids'] ?? [];
        if (!is_array($ids) || count($ids) === 0) {
            echo json_encode(["success" => false, "message" => "No question IDs provided for bulk delete."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmtDel = $db->prepare("INSERT INTO deleted_questions (question_id, sync_version) VALUES (?, ?)");
        $stmtRem = $db->prepare("DELETE FROM questions WHERE id = ?");

        $deletedCount = 0;
        foreach ($ids as $rawId) {
            $qId = intval($rawId);
            if ($qId > 0) {
                $stmtDel->bind_param("ii", $qId, $sync_version);
                $stmtDel->execute();
                $stmtRem->bind_param("i", $qId);
                $stmtRem->execute();
                $deletedCount++;
            }
        }

        echo json_encode(["success" => true, "message" => "Successfully soft-deleted {$deletedCount} questions."]);
        exit();
    }

    if ($action === 'bulk_move') {
        $ids = $data['ids'] ?? [];
        $target_topic_id = intval($data['target_topic_id'] ?? 0);

        if (!is_array($ids) || count($ids) === 0 || $target_topic_id <= 0) {
            echo json_encode(["success" => false, "message" => "Valid question IDs and target_topic_id are required."]);
            exit();
        }

        // Fetch subject_id of target topic
        $stmtTop = $db->prepare("SELECT subject_id FROM topics WHERE id = ?");
        $stmtTop->bind_param("i", $target_topic_id);
        $stmtTop->execute();
        $targetSubId = $stmtTop->get_result()->fetch_assoc()['subject_id'] ?? 0;

        if ($targetSubId <= 0) {
            echo json_encode(["success" => false, "message" => "Target topic does not exist."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmtMove = $db->prepare("UPDATE questions SET topic_id = ?, subject_id = ?, sync_version = ? WHERE id = ?");

        $movedCount = 0;
        foreach ($ids as $rawId) {
            $qId = intval($rawId);
            if ($qId > 0) {
                $stmtMove->bind_param("iiii", $target_topic_id, $targetSubId, $sync_version, $qId);
                $stmtMove->execute();
                $movedCount++;
            }
        }

        echo json_encode(["success" => true, "message" => "Successfully moved {$movedCount} questions."]);
        exit();
    }

    if ($action === 'bulk_change_difficulty') {
        $ids = $data['ids'] ?? [];
        $difficulty = trim($data['difficulty'] ?? 'medium');

        if (!is_array($ids) || count($ids) === 0 || !in_array($difficulty, ['easy', 'medium', 'hard'])) {
            echo json_encode(["success" => false, "message" => "Valid question IDs and difficulty are required."]);
            exit();
        }

        $sync_version = bumpSyncVersion($db);
        $stmtDiff = $db->prepare("UPDATE questions SET difficulty = ?, sync_version = ? WHERE id = ?");

        $updatedCount = 0;
        foreach ($ids as $rawId) {
            $qId = intval($rawId);
            if ($qId > 0) {
                $stmtDiff->bind_param("sii", $difficulty, $sync_version, $qId);
                $stmtDiff->execute();
                $updatedCount++;
            }
        }

        echo json_encode(["success" => true, "message" => "Successfully updated difficulty for {$updatedCount} questions."]);
        exit();
    }

    // CSV / Structured Bulk Import
    if ($action === 'bulk_import') {
        $filename = trim($data['filename'] ?? 'questions_import.csv');
        $subject_id = intval($data['subject_id'] ?? 0);
        $topic_id = intval($data['topic_id'] ?? 0);
        $rows = $data['rows'] ?? [];

        if (!is_array($rows) || count($rows) === 0) {
            echo json_encode(["success" => false, "message" => "No rows provided for import."]);
            exit();
        }

        $db->begin_transaction();
        $sync_version = bumpSyncVersion($db);

        $inserted_count = 0;
        $skipped_duplicates = 0;

        $stmtCheck = $db->prepare("SELECT id FROM questions WHERE subject_id = ? AND question_text = ? LIMIT 1");
        $stmtIns = $db->prepare("INSERT INTO questions (
            exam_type, subject_id, year, topic_id, difficulty,
            question_text, option_a, option_b, option_c, option_d, correct_answer,
            topic_explanation, correct_explanation, wrong_explanations, sync_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($rows as $pRow) {
            $qText = trim($pRow['question_text'] ?? '');
            $subId = intval($pRow['subject_id'] ?? $subject_id);
            $topId = intval($pRow['topic_id'] ?? $topic_id);
            $examType = strtoupper(trim($pRow['exam_type'] ?? 'JAMB'));
            $yr = intval($pRow['year'] ?? 2024);
            $diff = trim($pRow['difficulty'] ?? 'medium');
            $optA = trim($pRow['option_a'] ?? '');
            $optB = trim($pRow['option_b'] ?? '');
            $optC = trim($pRow['option_c'] ?? '');
            $optD = trim($pRow['option_d'] ?? '');
            $corrAns = strtoupper(trim($pRow['correct_answer'] ?? 'A'));
            $topExp = trim($pRow['topic_explanation'] ?? '');
            $corrExp = trim($pRow['correct_explanation'] ?? '');
            $wrongExp = trim($pRow['wrong_explanations'] ?? '');

            // Duplicate check
            $stmtCheck->bind_param("is", $subId, $qText);
            $stmtCheck->execute();
            if ($stmtCheck->get_result()->fetch_assoc()) {
                $skipped_duplicates++;
                continue;
            }

            $stmtIns->bind_param("siiissssssssssi",
                $examType, $subId, $yr, $topId, $diff,
                $qText, $optA, $optB, $optC, $optD, $corrAns,
                $topExp, $corrExp, $wrongExp, $sync_version
            );
            $stmtIns->execute();
            $inserted_count++;
        }

        // Record Upload History Log
        if ($inserted_count > 0 || $skipped_duplicates > 0) {
            $stmtLog = $db->prepare("INSERT INTO question_upload_logs (admin_user_id, filename, subject_id, topic_id, rows_imported, rows_skipped) VALUES (1, ?, ?, ?, ?, ?)");
            $stmtLog->bind_param("siiii", $filename, $subject_id, $topic_id, $inserted_count, $skipped_duplicates);
            $stmtLog->execute();
        }

        $db->commit();

        echo json_encode([
            "success" => true,
            "message" => "Imported {$inserted_count} questions, skipped {$skipped_duplicates} duplicates",
            "inserted_count" => $inserted_count,
            "skipped_duplicates" => $skipped_duplicates,
            "sync_version" => $sync_version
        ]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
