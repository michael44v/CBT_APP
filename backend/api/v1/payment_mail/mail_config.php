<?php
// SMTP settings for no-reply@filloptech.com
// Keep this file out of version control and outside public access if possible.
// Password can be set here or via the MAIL_PASSWORD environment variable.

return [
    'host'       => 'server260.web-hosting.com',
    'port'       => 465,                       // SSL/TLS (SMTPS)
    'username'   => 'no-reply@filloptech.com',
    'password'   => '76BMLEQXSTod',
    'from_email' => 'no-reply@filloptech.com',
    'from_name'  => 'Fillop Tech',
    'logo_url'   => 'https://filloptech.com/static/media/fillopsLogo.1c202d222ff474f9915a.png', // must be a public https URL; '' to hide logo
    'reply_to'   => 'support@filloptech.com',                      // e.g. 'support@filloptech.com' (optional)
    'log_file'   => __DIR__ . '/mail_errors.log',
];