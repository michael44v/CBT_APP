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
    $exam_type = trim($_GET['exam_type'] ?? '');
    $subject_id = trim($_GET['subject_id'] ?? '');

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

    if (count($conditions) > 0) {
        $sql .= " WHERE " . implode(" AND ", $conditions);
        $stmt = $db->prepare($sql);
        if ($stmt) {
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $res = $stmt->get_result();
        } else {
            $res = false;
        }
    } else {
        $res = $db->query($sql . " ORDER BY q.id DESC LIMIT 200");
    }

    $questions = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    echo json_encode(["success" => true, "questions" => $questions]);
    exit();
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = trim($data['action'] ?? '');

    if ($action === 'get_subjects_and_topics') {
        $subs_res = $db->query("SELECT * FROM subjects ORDER BY exam_type, name");
        $subjects = $subs_res ? $subs_res->fetch_all(MYSQLI_ASSOC) : [];

        $tops_res = $db->query("SELECT * FROM topics ORDER BY name");
        $topics = $tops_res ? $tops_res->fetch_all(MYSQLI_ASSOC) : [];

        echo json_encode(["success" => true, "subjects" => $subjects, "topics" => $topics]);
        exit();
    }

    if ($action === 'create_topic') {
        $subject_id = intval($data['subject_id'] ?? 0);
        $topic_name = trim($data['topic_name'] ?? '');

        if ($subject_id <= 0 || empty($topic_name)) {
            echo json_encode(["success" => false, "message" => "Subject ID and topic_name are required."]);
            exit();
        }

        // Check if topic exists
        $stmt = $db->prepare("SELECT id FROM topics WHERE subject_id = ? AND LOWER(name) = LOWER(?)");
        $stmt->bind_param("is", $subject_id, $topic_name);
        $stmt->execute();
        $res = $stmt->get_result();
        $row = $res->fetch_assoc();

        if ($row) {
            echo json_encode(["success" => true, "topic_id" => intval($row['id']), "message" => "Topic already exists."]);
            exit();
        }

        $stmt = $db->prepare("INSERT INTO topics (subject_id, name) VALUES (?, ?)");
        $stmt->bind_param("is", $subject_id, $topic_name);
        $stmt->execute();
        $new_topic_id = $db->insert_id;

        echo json_encode(["success" => true, "topic_id" => $new_topic_id, "message" => "Topic created successfully."]);
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

        // Map subject by name if subject_id not provided or <= 0
        if ($subject_id <= 0 && !empty($subject_name)) {
            $stmt = $db->prepare("SELECT id FROM subjects WHERE exam_type = ? AND LOWER(name) = LOWER(?) LIMIT 1");
            $stmt->bind_param("ss", $exam_type, $subject_name);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($row = $res->fetch_assoc()) {
                $subject_id = intval($row['id']);
            }
        }

        if (empty($exam_type) || $subject_id <= 0 || empty($year) || empty($question_text)) {
            echo json_encode(["success" => false, "message" => "Valid exam_type, subject, year, and question_text are required."]);
            exit();
        }

        // Map or create topic by name
        if ($topic_id <= 0) {
            if (!empty($topic_name)) {
                $stmt = $db->prepare("SELECT id FROM topics WHERE subject_id = ? AND LOWER(name) = LOWER(?) LIMIT 1");
                $stmt->bind_param("is", $subject_id, $topic_name);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($row = $res->fetch_assoc()) {
                    $topic_id = intval($row['id']);
                } else {
                    $stmtIns = $db->prepare("INSERT INTO topics (subject_id, name) VALUES (?, ?)");
                    $stmtIns->bind_param("is", $subject_id, $topic_name);
                    $stmtIns->execute();
                    $topic_id = $db->insert_id;
                }
            } else {
                // Default to first topic under subject or create a General topic
                $stmt = $db->prepare("SELECT id FROM topics WHERE subject_id = ? LIMIT 1");
                $stmt->bind_param("i", $subject_id);
                $stmt->execute();
                $res = $stmt->get_result();
                if ($row = $res->fetch_assoc()) {
                    $topic_id = intval($row['id']);
                } else {
                    $defTopic = "General";
                    $stmtIns = $db->prepare("INSERT INTO topics (subject_id, name) VALUES (?, ?)");
                    $stmtIns->bind_param("is", $subject_id, $defTopic);
                    $stmtIns->execute();
                    $topic_id = $db->insert_id;
                }
            }
        }

        $stmt = $db->prepare("INSERT INTO questions (exam_type, subject_id, year, topic_id, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("siiisssssss", $exam_type, $subject_id, $year, $topic_id, $difficulty, $question_text, $option_a, $option_b, $option_c, $option_d, $correct_answer);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Question added successfully."]);
        exit();
    }

    if ($action === 'delete' || $action === 'admin_delete_question') {
        $id = intval($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(["success" => false, "message" => "Invalid question ID."]);
            exit();
        }

        // Get new sync version
        $db->query("UPDATE sync_sequence SET current_version = current_version + 1 WHERE id = 1");
        $verRes = $db->query("SELECT current_version FROM sync_sequence WHERE id = 1");
        $sync_version = ($verRes && $verRow = $verRes->fetch_assoc()) ? intval($verRow['current_version']) : 1;

        // Record tombstone deletion
        $stmtDel = $db->prepare("INSERT INTO deleted_questions (question_id, sync_version) VALUES (?, ?)");
        $stmtDel->bind_param("ii", $id, $sync_version);
        $stmtDel->execute();

        // Delete question row
        $stmt = $db->prepare("DELETE FROM questions WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(["success" => true, "message" => "Question deleted successfully."]);
        exit();
    }

    // CSV Bulk Import validation and insert logic
    if ($action === 'bulk_import') {
        $csv_data = $data['csv_data'] ?? '';
        if (empty(trim($csv_data))) {
            echo json_encode(["success" => false, "message" => "No CSV data provided.", "errors" => ["No CSV data provided."]]);
            exit();
        }

        $lines = explode("\n", str_replace("\r", "", trim($csv_data)));
        if (count($lines) < 2) {
            echo json_encode(["success" => false, "message" => "CSV contains no data rows.", "errors" => ["CSV contains no data rows."]]);
            exit();
        }

        // Determine delimiter (comma or semicolon)
        $first_line = $lines[0];
        $delimiter = (substr_count($first_line, ';') > substr_count($first_line, ',')) ? ';' : ',';

        $header = str_getcsv(array_shift($lines), $delimiter);
        $header = array_map('strtolower', array_map('trim', $header));

        // Required headers
        $required_headers = ['exam_type', 'subject', 'year', 'topic', 'difficulty', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];

        $parsed_rows = [];
        $errors = [];
        $row_number = 1; // 1-based index corresponding to data row (Row 2 in file, etc.)

        foreach ($lines as $line) {
            $row_number++;
            if (empty(trim($line))) continue;

            $row_data = str_getcsv($line, $delimiter);
            if (count($row_data) < count($header)) {
                $errors[] = "Row {$row_number}: Column count mismatch (fewer columns than header).";
                continue;
            }

            $row = array_combine($header, array_slice($row_data, 0, count($header)));

            $exam_type = strtoupper(trim($row['exam_type'] ?? ''));
            $subject_name = trim($row['subject'] ?? $row['subject_name'] ?? '');
            $year_str = trim($row['year'] ?? '');
            $topic_name = trim($row['topic'] ?? $row['topic_name'] ?? '');
            $difficulty = strtolower(trim($row['difficulty'] ?? 'medium'));
            $question_text = trim($row['question_text'] ?? '');
            $option_a = trim($row['option_a'] ?? '');
            $option_b = trim($row['option_b'] ?? '');
            $option_c = trim($row['option_c'] ?? '');
            $option_d = trim($row['option_d'] ?? '');
            $correct_answer = strtoupper(trim($row['correct_answer'] ?? ''));
            $topic_explanation = trim($row['topic_explanation'] ?? '');
            $correct_explanation = trim($row['correct_explanation'] ?? '');
            $wrong_explanations = trim($row['wrong_explanations'] ?? '');

            // 1. Validate exam_type
            if (!in_array($exam_type, ['JAMB', 'WAEC', 'NECO'])) {
                $errors[] = "Row {$row_number}: Invalid exam_type '{$exam_type}' (must be JAMB, WAEC, or NECO).";
                continue;
            }

            // 2. Validate subject
            $stmtSub = $db->prepare("SELECT id FROM subjects WHERE exam_type = ? AND LOWER(name) = LOWER(?) LIMIT 1");
            $stmtSub->bind_param("ss", $exam_type, $subject_name);
            $stmtSub->execute();
            $resSub = $stmtSub->get_result();
            if (!$rowSub = $resSub->fetch_assoc()) {
                $errors[] = "Row {$row_number}: subject '{$subject_name}' not found for exam category {$exam_type}.";
                continue;
            }
            $subject_id = intval($rowSub['id']);

            // 3. Validate year (4 digits 2000-2099)
            if (!preg_match('/^(20\d{2})$/', $year_str)) {
                $errors[] = "Row {$row_number}: Invalid year '{$year_str}' (must be 4 digits between 2000 and 2099).";
                continue;
            }
            $year = intval($year_str);

            // 4. Validate topic (must exist under subject; do not auto-create)
            $stmtTop = $db->prepare("SELECT id FROM topics WHERE subject_id = ? AND LOWER(name) = LOWER(?) LIMIT 1");
            $stmtTop->bind_param("is", $subject_id, $topic_name);
            $stmtTop->execute();
            $resTop = $stmtTop->get_result();
            if (!$rowTop = $resTop->fetch_assoc()) {
                $errors[] = "Row {$row_number}: topic '{$topic_name}' not found under subject '{$subject_name}'.";
                continue;
            }
            $topic_id = intval($rowTop['id']);

            // 5. Validate non-empty question_text and option_a-d
            if (empty($question_text) || empty($option_a) || empty($option_b) || empty($option_c) || empty($option_d)) {
                $errors[] = "Row {$row_number}: question_text and options A–D must all be non-empty.";
                continue;
            }

            // 6. Validate correct_answer in A, B, C, D
            if (!in_array($correct_answer, ['A', 'B', 'C', 'D'])) {
                $errors[] = "Row {$row_number}: Invalid correct_answer '{$correct_answer}' (must be A, B, C, or D).";
                continue;
            }

            $parsed_rows[] = [
                'row_number' => $row_number,
                'exam_type' => $exam_type,
                'subject_id' => $subject_id,
                'year' => $year,
                'topic_id' => $topic_id,
                'difficulty' => empty($difficulty) ? 'medium' : $difficulty,
                'question_text' => $question_text,
                'option_a' => $option_a,
                'option_b' => $option_b,
                'option_c' => $option_c,
                'option_d' => $option_d,
                'correct_answer' => $correct_answer,
                'topic_explanation' => $topic_explanation,
                'correct_explanation' => $correct_explanation,
                'wrong_explanations' => $wrong_explanations
            ];
        }

        // If validation errors exist, return them all together and insert nothing
        if (count($errors) > 0) {
            echo json_encode([
                "success" => false,
                "message" => "Validation failed with " . count($errors) . " error(s). Nothing was imported.",
                "errors" => $errors,
                "inserted_count" => 0,
                "skipped_duplicates" => 0
            ]);
            exit();
        }

        // Otherwise insert everything in one transaction
        $db->begin_transaction();

        // Increment global sync version for bulk batch
        $db->query("UPDATE sync_sequence SET current_version = current_version + 1 WHERE id = 1");
        $verRes = $db->query("SELECT current_version FROM sync_sequence WHERE id = 1");
        $sync_version = ($verRes && $verRow = $verRes->fetch_assoc()) ? intval($verRow['current_version']) : 1;

        $inserted_count = 0;
        $skipped_duplicates = 0;

        $stmtCheck = $db->prepare("SELECT id FROM questions WHERE subject_id = ? AND question_text = ? LIMIT 1");
        $stmtIns = $db->prepare("INSERT INTO questions (
            exam_type, subject_id, year, topic_id, difficulty,
            question_text, option_a, option_b, option_c, option_d, correct_answer,
            topic_explanation, correct_explanation, wrong_explanations, sync_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

        foreach ($parsed_rows as $pRow) {
            // Duplicate check via (subject_id, question_text)
            $stmtCheck->bind_param("is", $pRow['subject_id'], $pRow['question_text']);
            $stmtCheck->execute();
            $resCheck = $stmtCheck->get_result();
            if ($resCheck->fetch_assoc()) {
                $skipped_duplicates++;
                continue;
            }

            $stmtIns->bind_param("siiissssssssssi",
                $pRow['exam_type'], $pRow['subject_id'], $pRow['year'], $pRow['topic_id'], $pRow['difficulty'],
                $pRow['question_text'], $pRow['option_a'], $pRow['option_b'], $pRow['option_c'], $pRow['option_d'], $pRow['correct_answer'],
                $pRow['topic_explanation'], $pRow['correct_explanation'], $pRow['wrong_explanations'], $sync_version
            );
            $stmtIns->execute();
            $inserted_count++;
        }

        $db->commit();

        echo json_encode([
            "success" => true,
            "message" => "Imported {$inserted_count} questions, skipped {$skipped_duplicates} duplicates",
            "inserted_count" => $inserted_count,
            "skipped_duplicates" => $skipped_duplicates,
            "errors" => []
        ]);
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
