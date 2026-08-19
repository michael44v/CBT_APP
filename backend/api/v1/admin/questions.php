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

    if ($action === 'delete') {
        $id = intval($data['id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM questions WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Question deleted successfully."]);
        exit();
    }

    // CSV Bulk Import validation and insert logic
    if ($action === 'bulk_import') {
        $csv_data = $data['csv_data'] ?? '';
        if (empty($csv_data)) {
            echo json_encode(["success" => false, "message" => "No CSV data provided."]);
            exit();
        }

        $lines = explode("\n", str_replace("\r", "", $csv_data));
        if (count($lines) < 2) {
            echo json_encode(["success" => false, "message" => "CSV contains no data rows."]);
            exit();
        }

        // Get header columns
        $header = str_getcsv(array_shift($lines));
        $header = array_map('strtolower', array_map('trim', $header));

        $inserted_count = 0;
        $errors = [];
        $line_number = 1;

        foreach ($lines as $line) {
            $line_number++;
            if (empty(trim($line))) continue;

            $row_data = str_getcsv($line);
            if (count($row_data) < count($header)) {
                $errors[] = "Line {$line_number}: Column mismatch. Row has fewer elements than headers.";
                continue;
            }

            $row = array_combine($header, array_slice($row_data, 0, count($header)));

            $exam_type = strtoupper(trim($row['exam_type'] ?? ''));
            $subject_id_val = trim($row['subject_id'] ?? '');
            $subject_name_val = trim($row['subject_name'] ?? $row['subject'] ?? '');
            $year_val = trim($row['year'] ?? '');

            // Resolve subject_id
            $subject_id = intval($subject_id_val);
            if ($subject_id <= 0 && !empty($subject_name_val)) {
                $stmtSub = $db->prepare("SELECT id FROM subjects WHERE exam_type = ? AND LOWER(name) = LOWER(?) LIMIT 1");
                $stmtSub->bind_param("ss", $exam_type, $subject_name_val);
                $stmtSub->execute();
                $resSub = $stmtSub->get_result();
                if ($rowSub = $resSub->fetch_assoc()) {
                    $subject_id = intval($rowSub['id']);
                }
            }

            // Validation: reject if missing any of required filterable columns
            if (empty($exam_type) || $subject_id <= 0 || empty($year_val)) {
                $errors[] = "Line {$line_number} rejected: Missing required fields 'exam_type', 'subject' (or 'subject_id'), or 'year'.";
                continue;
            }

            $year = intval($year_val);
            $topic_id_val = trim($row['topic_id'] ?? '');
            $topic_name_val = trim($row['topic_name'] ?? $row['topic'] ?? '');
            $topic_id = intval($topic_id_val);

            // Resolve or create topic_id
            if ($topic_id <= 0) {
                if (!empty($topic_name_val)) {
                    $stmtTop = $db->prepare("SELECT id FROM topics WHERE subject_id = ? AND LOWER(name) = LOWER(?) LIMIT 1");
                    $stmtTop->bind_param("is", $subject_id, $topic_name_val);
                    $stmtTop->execute();
                    $resTop = $stmtTop->get_result();
                    if ($rowTop = $resTop->fetch_assoc()) {
                        $topic_id = intval($rowTop['id']);
                    } else {
                        $stmtInsTop = $db->prepare("INSERT INTO topics (subject_id, name) VALUES (?, ?)");
                        $stmtInsTop->bind_param("is", $subject_id, $topic_name_val);
                        $stmtInsTop->execute();
                        $topic_id = $db->insert_id;
                    }
                } else {
                    $stmtTopDef = $db->prepare("SELECT id FROM topics WHERE subject_id = ? LIMIT 1");
                    $stmtTopDef->bind_param("i", $subject_id);
                    $stmtTopDef->execute();
                    $resTopDef = $stmtTopDef->get_result();
                    if ($rowTopDef = $resTopDef->fetch_assoc()) {
                        $topic_id = intval($rowTopDef['id']);
                    } else {
                        $defName = "General";
                        $stmtInsDef = $db->prepare("INSERT INTO topics (subject_id, name) VALUES (?, ?)");
                        $stmtInsDef->bind_param("is", $subject_id, $defName);
                        $stmtInsDef->execute();
                        $topic_id = $db->insert_id;
                    }
                }
            }
            $difficulty = trim($row['difficulty'] ?? 'medium');
            $question_text = trim($row['question_text'] ?? '');
            $option_a = trim($row['option_a'] ?? '');
            $option_b = trim($row['option_b'] ?? '');
            $option_c = trim($row['option_c'] ?? '');
            $option_d = trim($row['option_d'] ?? '');
            $correct_answer = strtoupper(trim($row['correct_answer'] ?? ''));
            $topic_explanation = trim($row['topic_explanation'] ?? '');
            $correct_explanation = trim($row['correct_explanation'] ?? '');
            $wrong_explanations = trim($row['wrong_explanations'] ?? '');

            if (empty($question_text) || empty($option_a) || empty($correct_answer)) {
                $errors[] = "Line {$line_number}: Missing question_text, option_a, or correct_answer.";
                continue;
            }

            // Insert into questions
            $stmt = $db->prepare("INSERT INTO questions (
                exam_type, subject_id, year, topic_id, difficulty,
                question_text, option_a, option_b, option_c, option_d, correct_answer,
                topic_explanation, correct_explanation, wrong_explanations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $stmt->bind_param("siiissssssssss",
                $exam_type, $subject_id, $year, $topic_id, $difficulty,
                $question_text, $option_a, $option_b, $option_c, $option_d, $correct_answer,
                $topic_explanation, $correct_explanation, $wrong_explanations
            );
            $stmt->execute();
            $inserted_count++;
        }

        if (count($errors) > 0) {
            echo json_encode([
                "success" => false,
                "message" => "Import completed with errors. Saved " . $inserted_count . " questions.",
                "errors" => $errors,
                "synced_count" => $inserted_count
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "message" => "Successfully imported " . $inserted_count . " questions without any errors.",
                "synced_count" => $inserted_count
            ]);
        }
        exit();
    }

    echo json_encode(["success" => false, "message" => "Unknown action specified."]);
    exit();
}
