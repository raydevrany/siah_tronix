<?php
session_start();
header("Content-Type: application/json");
require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        getProduct($pdo, $_GET['id']);
    } else {
        getProducts($pdo);
    }
} elseif ($method === 'POST') {
    if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { echo json_encode(['error' => 'Invalid input']); exit; }

    $name = $data['name'] ?? '';
    $desc = $data['description'] ?? '';
    $price = $data['price'] ?? 0;
    $categoryName = $data['category'] ?? '';
    $imageData = $data['image'] ?? '';
    $badge = $data['badge'] ?? '';
    $stock = $data['stock'] ?? 0;
    $specs = $data['specs'] ?? [];
    $id = $data['id'] ?? null;

    if (!$name || !$desc || !$price || !$categoryName || !$imageData) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    // Get category ID
    $stmtCat = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
    $stmtCat->execute([$categoryName]);
    $categoryId = $stmtCat->fetchColumn();
    if (!$categoryId) {
        echo json_encode(['error' => 'Invalid category']);
        exit;
    }

    // Handle Image
    $imagePath = $imageData;
    if (strpos($imageData, 'data:image/') === 0) {
        $parts = explode(',', $imageData);
        $content = base64_decode($parts[1]);
        $extension = 'png';
        if (strpos($parts[0], 'jpeg') !== false) $extension = 'jpg';
        if (strpos($parts[0], 'webp') !== false) $extension = 'webp';
        
        $filename = 'prod_' . time() . '_' . uniqid() . '.' . $extension;
        $fullPath = '../uploads/' . $filename;
        if (file_put_contents($fullPath, $content)) {
            $imagePath = 'uploads/' . $filename;
        } else {
            echo json_encode(['error' => 'Failed to save image']);
            exit;
        }
    }

    try {
        if ($id) {
            // Update
            $stmt = $pdo->prepare("UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image = ?, stock = ?, badge = ? WHERE id = ?");
            $stmt->execute([$categoryId, $name, $desc, $price, $imagePath, $stock, $badge, $id]);
            
            // Update Specs
            $pdo->prepare("DELETE FROM product_specs WHERE product_id = ?")->execute([$id]);
            foreach ($specs as $s) {
                $pdo->prepare("INSERT INTO product_specs (product_id, spec_value) VALUES (?, ?)")->execute([$id, $s]);
            }
        } else {
            // Add
            $stmt = $pdo->prepare("INSERT INTO products (category_id, name, description, price, image, stock, badge) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$categoryId, $name, $desc, $price, $imagePath, $stock, $badge]);
            $newId = $pdo->lastInsertId();
            
            // Add Specs
            foreach ($specs as $s) {
                $pdo->prepare("INSERT INTO product_specs (product_id, spec_value) VALUES (?, ?)")->execute([$newId, $s]);
            }
        }
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

function getProducts($pdo) {
    try {
        $sql = "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id";
        $where = [];
        $params = [];

        if (isset($_GET['category']) && $_GET['category'] !== 'All') {
            $where[] = "c.name = ?";
            $params[] = $_GET['category'];
        }
        
        if (isset($_GET['search'])) {
            $where[] = "(p.name LIKE ? OR p.description LIKE ?)";
            $searchTerm = "%" . $_GET['search'] . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        
        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        if (empty($products)) {
            echo json_encode([]);
            return;
        }

        // Fetch all specs for these products in one go
        $productIds = array_column($products, 'id');
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        
        $stmtSpecs = $pdo->prepare("SELECT product_id, spec_value FROM product_specs WHERE product_id IN ($placeholders)");
        $stmtSpecs->execute($productIds);
        $allSpecs = $stmtSpecs->fetchAll();

        // Group specs by product_id
        $specsGrouped = [];
        foreach ($allSpecs as $s) {
            $specsGrouped[$s['product_id']][] = $s['spec_value'];
        }

        // Map specs back to products
        foreach ($products as &$product) {
            $product['specs'] = $specsGrouped[$product['id']] ?? [];
            $product['category'] = $product['category_name'];
            $product['inStock'] = $product['stock'] > 0;
            $product['price'] = (int)$product['price'];
        }

        echo json_encode($products);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function getProduct($pdo, $id) {
    $stmt = $pdo->prepare("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?");
    $stmt->execute([$id]);
    $product = $stmt->fetch();

    if ($product) {
        $stmtSpecs = $pdo->prepare("SELECT spec_value FROM product_specs WHERE product_id = ?");
        $stmtSpecs->execute([$id]);
        $product['specs'] = $stmtSpecs->fetchAll(PDO::FETCH_COLUMN);
        $product['category'] = $product['category_name'];
        $product['price'] = (int)$product['price'];
        echo json_encode($product);
    } else {
        echo json_encode(['error' => 'Product not found']);
    }
}
