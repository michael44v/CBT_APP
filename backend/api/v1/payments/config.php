<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$public_key = getenv('PAYSTACK_PUBLIC_KEY') ?: (getenv('PAYSTACK_KEY') ?: '');

echo json_encode([
    "success" => true,
    "public_key" => $public_key
]);
