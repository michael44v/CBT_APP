<?php
require_once __DIR__ . '/db/db.php';

$result_id = isset($_GET['result']) ? intval($_GET['result']) : 0;
$result = null;
$user = null;

if ($result_id > 0) {
    try {
        $db = getDbConnection();
        $stmt = $db->prepare("SELECT r.*, u.name as candidate_name FROM results r LEFT JOIN users u ON r.email = u.email WHERE r.id = ?");
        $stmt->bind_param("i", $result_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $res->num_rows > 0) {
            $result = $res->fetch_assoc();
        }
    } catch (Throwable $e) {
        error_log("Failed to load result ID $result_id: " . $e->getMessage());
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fillop CBT Guru - Official Exam Result</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1d3090;
            --primary-dark: #121e5f;
            --bg: #f4f6fb;
            --surface: #ffffff;
            --text: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --success: #10b981;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background-color: var(--bg); color: var(--text); padding: 40px 20px; min-height: 100vh; }
        .container { max-width: 680px; margin: 0 auto; background: var(--surface); padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid var(--border); }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 70px; height: 70px; border-radius: 50%; border: 3px solid var(--primary); margin-bottom: 16px; }
        h1 { font-size: 24px; font-weight: 800; color: var(--primary); margin-bottom: 6px; }
        p.subtitle { color: var(--text-muted); font-size: 14px; }
        .result-circle { width: 140px; height: 140px; border-radius: 50%; border: 6px solid var(--success); display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 24px auto; background: #f0fdf4; }
        .result-circle .pct { font-size: 34px; font-weight: 900; color: var(--success); }
        .result-circle .lbl { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 24px; font-size: 14px; }
        .info-item span { display: block; color: var(--text-muted); font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .info-item strong { color: var(--text); font-weight: 800; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
        th { background: #f1f5f9; color: var(--primary); font-weight: 800; }
        .btn { display: inline-block; width: 100%; text-align: center; padding: 14px; border-radius: 12px; background: var(--primary); color: white; font-weight: 700; text-decoration: none; margin-top: 24px; }
        .btn:hover { background: var(--primary-dark); }
        .not-found { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <img src="icon.png" class="logo" alt="Fillop CBT Logo" onerror="this.src='/fillop/icon.png'">
        <h1>Fillop CBT Guru - Online Exam Result</h1>
        <p class="subtitle">Verified Performance &amp; Candidate Score Record</p>
    </div>

    <?php if ($result): ?>
        <div class="result-circle">
            <span class="pct"><?php echo round($result['percentage']); ?>%</span>
            <span class="lbl">Overall Score</span>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <span>Candidate Name</span>
                <strong><?php echo htmlspecialchars($result['candidate_name'] ?: ($result['email'] ?: 'Candidate')); ?></strong>
            </div>
            <div class="info-item">
                <span>Exam Category</span>
                <strong><?php echo htmlspecialchars($result['exam_type']); ?> CBT</strong>
            </div>
            <div class="info-item">
                <span>Score Breakdown</span>
                <strong><?php echo intval($result['score']); ?> / <?php echo intval($result['total_questions']); ?> Questions</strong>
            </div>
            <div class="info-item">
                <span>Date Submitted</span>
                <strong><?php echo date('M j, Y h:i A', strtotime($result['submitted_at'])); ?></strong>
            </div>
        </div>

        <?php
        $details = json_decode($result['details'] ?? '[]', true);
        if (is_array($details) && count($details) > 0):
        ?>
            <h3 style="font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 12px;">Subject Breakdown</h3>
            <table>
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($details as $sub): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($sub['subject_name'] ?? $sub['subject'] ?? 'Subject'); ?></strong></td>
                            <td><?php echo intval($sub['score'] ?? 0); ?> / <?php echo intval($sub['total'] ?? 0); ?></td>
                            <td><strong><?php echo isset($sub['percentage']) ? round($sub['percentage']) . '%' : (isset($sub['total']) && $sub['total'] > 0 ? round(($sub['score'] / $sub['total']) * 100) . '%' : '0%'); ?></strong></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>

        <a href="subscribe.php" class="btn">🚀 Prepare for Exams with Fillop CBT Guru</a>
    <?php else: ?>
        <div class="not-found">
            <h2>Result Record Not Found</h2>
            <p style="margin-top: 8px;">The requested exam result record could not be found or has not been synced online yet.</p>
            <a href="subscribe.php" class="btn">Go to Portal</a>
        </div>
    <?php endif; ?>
</div>

</body>
</html>
