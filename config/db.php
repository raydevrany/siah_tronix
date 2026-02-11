<?php
// Database Configuration
define('DB_HOST', '127.0.0.1'); // Sometimes 'localhost' resolves to IPv6 ::1 which can cause issues with XAMPP
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'siah_tronix');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
    // Set the PDO error mode to exception
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    // In production, log this error instead of showing it
    die("Connection failed: " . $e->getMessage());
}
