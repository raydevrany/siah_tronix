<?php
header("Content-Type: application/json");
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT name FROM categories ORDER BY name ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Ensure "All" is not in DB but handled by frontend, or we can prepend it here if we want strict consistency.
        // Frontend expects ["All", "Smartphones", ...] usually, but let's just return the DB list.
        echo json_encode($categories);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Failed to fetch categories']);
    }
} else {
    echo json_encode(['error' => 'Method not allowed']);
}

