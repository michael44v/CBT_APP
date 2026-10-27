<?php
/**
 * email_template.php
 * Builds the HTML + plain-text "Payment successful / your passcodes" email.
 * Colors match the Fillop CBT Guru subscribe page.
 */

function renderPaymentEmail(array $d, array $config): array
{
    // Brand colors (from subscribe.php)
    $primary     = '#1d3090';
    $primaryDark = '#121e5f';
    $bg          = '#f4f6fb';
    $surface     = '#ffffff';
    $text        = '#1e293b';
    $muted       = '#64748b';
    $border      = '#e2e8f0';
    $success     = '#10b981';
    $tint        = '#e0e7ff';   // passcode box background
    $warnBg      = '#fef3c7';
    $warnText    = '#92400e';

    $h = static fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');

    $name       = trim($d['name'] ?? '') ?: 'Customer';
    $currency   = strtoupper($d['currency'] ?? 'NGN');
    $symbol     = $currency === 'NGN' ? '₦' : $currency . ' ';
    $amountNum  = isset($d['amount']) ? (float)$d['amount'] : null;
    $amount     = $amountNum === null ? '' : ($amountNum == 0 ? 'Free (promo)' : $symbol . number_format($amountNum, 2));
    $reference  = $d['reference'] ?? '';
    $date       = $d['date'] ?? date('d M Y, H:i');
    $passcodes  = array_values(array_filter((array)($d['passcodes'] ?? [])));
    $categories = $d['categories'] ?? '';
    if (is_array($categories)) $categories = implode(', ', $categories);
    $subjects   = $d['subjects'] ?? [];
    if (is_string($subjects)) $subjects = array_filter(array_map('trim', explode(',', $subjects)));
    $months     = (int)($d['duration_months'] ?? 0);
    $duration   = $months >= 12 ? '1 Year' : ($months > 0 ? $months . ' Month' . ($months > 1 ? 's' : '') : '');
    $devices    = (int)($d['max_devices'] ?? 0);
    $org        = $d['organization_name'] ?? '';
    $logo       = $config['logo_url'] ?? '';

    // ---------- Detail rows ----------
    $rows = [
        'Reference'      => $reference,
        'Date'           => $date,
        'Amount paid'    => $amount,
        'Categories'     => $categories,
        'Duration'       => $duration,
        'Devices / code' => $devices ?: '',
        'Passcodes'      => $passcodes ? count($passcodes) : '',
        'Organization'   => $org,
    ];
    $rowsHtml = '';
    foreach ($rows as $label => $value) {
        if ($value === '' || $value === null) continue;
        $rowsHtml .= '<tr>'
            . '<td style="padding:9px 0;font-size:14px;color:' . $muted . ';border-bottom:1px solid ' . $border . '">' . $h($label) . '</td>'
            . '<td align="right" style="padding:9px 0;font-size:14px;font-weight:700;color:' . $text . ';border-bottom:1px solid ' . $border . '">' . $h($value) . '</td>'
            . '</tr>';
    }

    // ---------- Passcodes ----------
    $codesHtml = '';
    foreach ($passcodes as $i => $code) {
        $codesHtml .= '<tr><td style="padding:8px 0;border-bottom:1px solid rgba(29,48,144,0.12);'
            . 'font-family:Consolas,Menlo,monospace;font-size:17px;font-weight:800;color:' . $primary . ';word-break:break-all">'
            . ($i + 1) . '. ' . $h($code) . '</td></tr>';
    }
    $codesLabel = count($passcodes) > 1 ? 'Your Passcodes' : 'Your Passcode';

    // ---------- Subjects ----------
    $subjectsHtml = '';
    if ($subjects) {
        $chips = '';
        foreach ($subjects as $s) {
            $chips .= '<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:20px;'
                . 'background:' . $tint . ';color:' . $primary . ';font-size:12px;font-weight:700">' . $h($s) . '</span>';
        }
        $subjectsHtml = '<p style="margin:22px 0 8px;font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:' . $primary . '">Subjects Unlocked</p>'
            . '<div>' . $chips . '</div>';
    }

    $logoHtml = $logo
        ? '<img src="' . $h($logo) . '" width="64" height="64" alt="Fillop CBT Guru" style="display:block;margin:0 auto 12px;border-radius:50%;border:3px solid #ffffff">'
        : '';

    $attachNote = count($passcodes) > 1
        ? '<p style="margin:10px 0 0;font-size:12px;color:' . $muted . '">A CSV copy of all passcodes is attached to this email.</p>'
        : '';

    $html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        . '<title>Payment Successful</title></head>'
        . '<body style="margin:0;padding:0;background:' . $bg . ';font-family:Inter,Arial,Helvetica,sans-serif;color:' . $text . '">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:' . $bg . ';padding:24px 12px"><tr><td align="center">'
        . '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:' . $surface . ';border-radius:16px;overflow:hidden;border:1px solid ' . $border . '">'

        // Header
        . '<tr><td align="center" style="background:' . $primary . ';background-image:linear-gradient(135deg,' . $primary . ',' . $primaryDark . ');padding:28px 24px">'
        . $logoHtml
        . '<div style="font-size:22px;font-weight:800;color:#ffffff">Fillop CBT Guru</div>'
        . '<div style="font-size:13px;color:#c7d2fe;margin-top:4px">Payment Confirmation</div>'
        . '</td></tr>'

        // Body
        . '<tr><td style="padding:28px 28px 8px">'
        . '<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:14px"><tr>'
        . '<td style="background:' . $success . ';color:#fff;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:800;letter-spacing:.4px">&#10003; PAYMENT SUCCESSFUL</td></tr></table>'
        . '<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:' . $primary . '">Hi ' . $h($name) . ',</h1>'
        . '<p style="margin:0;font-size:15px;line-height:1.6;color:' . $text . '">Thank you for your purchase. Your payment has been confirmed and your '
        . (count($passcodes) > 1 ? 'passcodes are' : 'passcode is') . ' ready to use.</p>'

        // Passcode box
        . '<p style="margin:24px 0 8px;font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:' . $primary . '">' . $codesLabel . '</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:' . $tint . ';border:2px dashed ' . $primary . ';border-radius:12px"><tr><td style="padding:10px 16px">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">' . $codesHtml . '</table>'
        . '</td></tr></table>'
        . $attachNote

        // Steps
        . '<p style="margin:24px 0 8px;font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:' . $primary . '">How to activate</p>'
        . '<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:' . $text . '">'
        . '<li>Open the <strong>Fillop CBT Guru</strong> desktop app.</li>'
        . '<li>Enter your passcode when prompted.</li>'
        . '<li>Your selected subjects unlock and you can start practising.</li></ol>'

        . $subjectsHtml

        // Details
        . '<p style="margin:24px 0 4px;font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:' . $primary . '">Order Summary</p>'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">' . $rowsHtml . '</table>'

        // Warning
        . '<div style="margin:24px 0 8px;background:' . $warnBg . ';border-left:4px solid #f59e0b;color:' . $warnText . ';padding:12px 16px;border-radius:8px;font-size:13px;font-weight:600;line-height:1.5">'
        . 'Keep your passcode(s) private. Anyone with a code can use it, up to the allowed number of devices.</div>'
        . '</td></tr>'

        // Footer
        . '<tr><td align="center" style="padding:20px 28px 28px;font-size:12px;color:' . $muted . ';line-height:1.6;border-top:1px solid ' . $border . '">'
        . 'This is an automated message from no-reply. Please do not reply.<br>&copy; ' . date('Y') . ' Fillop Tech. All rights reserved.'
        . '</td></tr>'
        . '</table></td></tr></table></body></html>';

    // ---------- Plain text ----------
    $t  = "Hi {$name},\n\nYour payment was successful.\n\n";
    $t .= strtoupper($codesLabel) . ":\n";
    foreach ($passcodes as $i => $c) $t .= ($i + 1) . ". {$c}\n";
    $t .= "\nHOW TO ACTIVATE:\n1. Open the Fillop CBT Guru desktop app.\n2. Enter your passcode.\n3. Your subjects unlock.\n\nORDER SUMMARY:\n";
    foreach ($rows as $label => $value) {
        if ($value !== '' && $value !== null) $t .= "{$label}: {$value}\n";
    }
    $t .= "\nKeep your passcode(s) private.\n\nFillop Tech";

    return ['html' => $html, 'text' => $t];
}