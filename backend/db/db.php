<?php

if (!function_exists('getDbConnection')) {
    function getDbConnection() {
        static $conn = null;
        if ($conn === null) {
            $host = getenv('DB_HOST') ?: "localhost";
            $username = getenv('DB_USER') ?: "root";
            $password = getenv('DB_PASS') ?: "";
            $dbname = getenv('DB_NAME') ?: "fillop";
            $port = getenv('DB_PORT') ?: 3306;

            $conn = mysqli_connect($host, $username, $password, $dbname, $port);
            if (!$conn) {
                error_log("Database connection failed: " . mysqli_connect_error());
                die(json_encode([
                    "success" => false,
                    "message" => "Database connection failed."
                ]));
            }
            mysqli_set_charset($conn, "utf8mb4");
        }
        return $conn;
    }
}
