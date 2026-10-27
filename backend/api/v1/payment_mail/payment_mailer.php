<?php
/**
 * payment_mailer.php
 *
 * Emails the buyer their passcode(s) and order details after a SUCCESSFUL,
 * server-verified payment. Uses PHPMailer + mail_config.php + email_template.php.
 *
 * Call it from the server (e.g. at the end of /api/v1/payments/verify.php),
 * right after the passcodes are generated, never from browser JavaScript:
 *
 *   require_once __DIR__ . '/path/to/payment_mailer.php';
 *
 *   $mail = sendPaymentSuccessEmail([
 *       'email'             => $buyerEmail,            // required
 *       'name'              => $buyerName,
 *       'passcodes'         => $passcodesArray,        // required, array of strings
 *       'reference'         => $reference,
 *       'amount'            => $amountPaid,            // 0 for free promo
 *       'currency'          => 'NGN',
 *       'categories'        => 'JAMB,WAEC',            // string or array
 *       'subjects'          => ['Mathematics', 'English Language'],
 *       'duration_months'   => 6,
 *       'max_devices'       => 1,
 *       'organization_name' => $orgName,
 *   ]);
 *
 * It never throws. Failures are logged to mail_errors.log and returned as
 * ['success' => false, 'message' => '...'], so a mail problem can't break
 * passcode delivery.
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Skip loading our copy if PHPMailer was already loaded elsewhere in the app
if (!class_exists('PHPMailer\PHPMailer\PHPMailer', false)) {
    require_once __DIR__ . '/src/Exception.php';
    require_once __DIR__ . '/src/PHPMailer.php';
    require_once __DIR__ . '/src/SMTP.php';
}
require_once __DIR__ . '/email_template.php';

function sendPaymentSuccessEmail(array $data): array
{
    $config = require __DIR__ . '/mail_config.php';

    $email = trim($data['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return paymentMailerFail($config, 'Invalid or missing recipient email.');
    }
    if (empty($data['passcodes']) || !is_array($data['passcodes'])) {
        return paymentMailerFail($config, 'No passcodes supplied for ' . $email);
    }

    $name = trim($data['name'] ?? '') ?: 'Customer';
    $tpl  = renderPaymentEmail($data, $config);

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $config['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $config['username'];
        $mail->Password   = $config['password'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // port 465
        $mail->Port       = (int)$config['port'];
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 15;

        $mail->setFrom($config['from_email'], $config['from_name']);
        if (!empty($config['reply_to'])) {
            $mail->addReplyTo($config['reply_to']);
        }
        $mail->addAddress($email, $name);

        $ref = $data['reference'] ?? '';
        $mail->isHTML(true);
        $mail->Subject = 'Your Fillop CBT Guru Passcode' . (count($data['passcodes']) > 1 ? 's' : '')
                       . ($ref !== '' ? " - {$ref}" : '');
        $mail->Body    = $tpl['html'];
        $mail->AltBody = $tpl['text'];

        // Bulk orders: attach a CSV copy of all codes
        if (count($data['passcodes']) > 1) {
            $csv = "Passcode,Status\n";
            foreach ($data['passcodes'] as $c) {
                $csv .= '"' . str_replace('"', '""', (string)$c) . "\",Active\n";
            }
            $mail->addStringAttachment($csv, 'Fillop_CBT_Passcodes.csv', 'base64', 'text/csv');
        }

        $mail->send();
        return ['success' => true, 'message' => 'Email sent.'];
    } catch (Exception $e) {
        return paymentMailerFail($config, 'Mailer error: ' . $mail->ErrorInfo);
    } catch (\Throwable $e) {
        return paymentMailerFail($config, 'Unexpected error: ' . $e->getMessage());
    }
}

function paymentMailerFail(array $config, string $message): array
{
    if (!empty($config['log_file'])) {
        @file_put_contents($config['log_file'], '[' . date('c') . '] ' . $message . PHP_EOL, FILE_APPEND);
    }
    return ['success' => false, 'message' => $message];
}