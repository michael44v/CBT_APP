<?php
/**
 * SMTP Mailer Configuration & Dispatcher Utility Placeholder
 * Fillop CBT Guru - Automated Email Notifications
 */

class FillopMailer {
    // SMTP Credentials Configuration Placeholder
    private static $smtp_host = 'smtp.filloptech.com'; // e.g., smtp.gmail.com or mail.yourdomain.com
    private static $smtp_port = 587;                   // e.g., 587 (TLS) or 465 (SSL)
    private static $smtp_username = 'notifications@filloptech.com';
    private static $smtp_password = 'YOUR_SMTP_PASSWORD_HERE';
    private static $smtp_secure = 'tls';               // 'tls' or 'ssl'
    private static $from_email = 'no-reply@filloptech.com';
    private static $from_name  = 'Fillop CBT Guru Portal';

    /**
     * Sends purchase confirmation email with generated passcodes
     */
    public static function sendPasscodeReceipt($to_email, $to_name, $passcodes, $exam_category, $quantity, $amount_paid, $reference) {
        $subject = "Your Fillop CBT Passcode Receipt [Ref: {$reference}]";

        $passcode_items = "";
        foreach ($passcodes as $idx => $code) {
            $num = $idx + 1;
            $passcode_items .= "<li style='font-family: monospace; font-size: 18px; font-weight: bold; color: #1d3090; padding: 6px 0;'>{$num}. {$code}</li>";
        }

        $formatted_amount = "₦" . number_format($amount_paid, 2);

        $body = "
        <html>
        <head>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6fb; color: #1e293b; padding: 20px; }
                .card { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .header { text-align: center; border-bottom: 2px solid #1d3090; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { color: #1d3090; font-size: 22px; margin: 0; }
                .passcode-box { background: #e0e7ff; border: 2px dashed #1d3090; border-radius: 8px; padding: 15px; margin: 20px 0; }
                .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class='card'>
                <div class='header'>
                    <h1>Fillop CBT Guru - Payment Receipt</h1>
                </div>
                <p>Hello <strong>{$to_name}</strong>,</p>
                <p>Thank you for subscribing to Fillop CBT Guru! Your payment has been verified successfully.</p>

                <table style='width: 100%; font-size: 14px; margin: 15px 0;'>
                    <tr><td><strong>Payment Reference:</strong></td><td>{$reference}</td></tr>
                    <tr><td><strong>Exam Category:</strong></td><td>{$exam_category}</td></tr>
                    <tr><td><strong>Passcode Quantity:</strong></td><td>{$quantity} Code(s)</td></tr>
                    <tr><td><strong>Total Amount Paid:</strong></td><td>{$formatted_amount}</td></tr>
                </table>

                <div class='passcode-box'>
                    <h3 style='margin-top:0; color:#1d3090;'>Your Generated Passcode(s):</h3>
                    <ul style='list-style-type: none; padding-left: 0;'>
                        {$passcode_items}
                    </ul>
                </div>

                <p>Enter your passcode in the Fillop CBT Guru Desktop Terminal to activate your full offline subscription.</p>

                <div class='footer'>
                    Fillop Technologies • Support: support@filloptech.com • www.filloptech.com
                </div>
            </div>
        </body>
        </html>
        ";

        return self::dispatchMail($to_email, $subject, $body);
    }

    /**
     * Dispatch mailer using standard PHP mail or SMTP socket connection
     */
    private static function dispatchMail($to_email, $subject, $html_body) {
        $headers  = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
        $headers .= "From: " . self::$from_name . " <" . self::$from_email . ">" . "\r\n";
        $headers .= "Reply-To: " . self::$from_email . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        // Attempt sending email
        try {
            if (self::$smtp_password !== 'YOUR_SMTP_PASSWORD_HERE') {
                // If custom SMTP socket connection logic or PHPMailer is loaded later:
                // ...
            }
            return @mail($to_email, $subject, $html_body, $headers);
        } catch (Throwable $e) {
            error_log("FillopMailer Error: " . $e->getMessage());
            return false;
        }
    }
}
