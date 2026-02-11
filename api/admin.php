<?php
header("Content-Type: application/json");
require_once '../config/db.php';
session_start();

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Close session writing to allow concurrent requests (performance fix)
session_write_close();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'stats':
        getStats($pdo);
        break;
    case 'users':
        getUsers($pdo);
        break;
    case 'orders':
        getOrders($pdo);
        break;
    case 'update_order_status':
        if ($method === 'POST') updateOrderStatus($pdo);
        break;
    case 'delete_order':
        if ($method === 'POST') deleteOrder($pdo);
        break;
    case 'add_category':
        if ($method === 'POST') addCategory($pdo);
        break;
    case 'edit_category':
        if ($method === 'POST') editCategory($pdo);
        break;
    case 'delete_category':
        if ($method === 'POST') deleteCategoryAction($pdo);
        break;
    case 'delete_user':
        if ($method === 'POST') deleteUser($pdo);
        break;
    case 'edit_user':
        if ($method === 'POST') editUser($pdo);
        break;
    case 'add_user':
        if ($method === 'POST') addUser($pdo);
        break;
    case 'add_product':
        if ($method === 'POST') saveProduct($pdo);
        break;
    case 'edit_product':
        if ($method === 'POST') saveProduct($pdo);
        break;
    case 'delete_product':
        if ($method === 'POST') deleteProduct($pdo);
        break;
    case 'edit_product_stock':
        if ($method === 'POST') setProductStock($pdo);
        break;
    default:
        echo json_encode(['error' => 'Invalid action']);
}

function getStats($pdo) {
    $stats = [];
    
    $stats['products'] = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
    $stats['orders'] = $pdo->query("SELECT COUNT(*) FROM orders WHERE is_deleted_by_admin = 0")->fetchColumn();
    $stats['users'] = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $stats['categories'] = $pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
    
    echo json_encode($stats);
}

function getUsers($pdo) {
    $stmt = $pdo->query("SELECT id, first_name AS firstName, last_name AS lastName, email, role, created_at FROM users ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
}

function getOrders($pdo) {
    $stmt = $pdo->query("
        SELECT o.*, o.order_number as orderNumber, CONCAT(u.first_name, ' ', u.last_name) as userName, u.email as userEmail 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        WHERE o.is_deleted_by_admin = 0
        ORDER BY o.created_at DESC
    ");
    $orders = $stmt->fetchAll();
    
    if (empty($orders)) {
        echo json_encode([]);
        return;
    }

    $orderIds = array_column($orders, 'id');
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    
    $stmtItems = $pdo->prepare("
        SELECT oi.*, p.name 
        FROM order_items oi 
        LEFT JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id IN ($placeholders)
    ");
    $stmtItems->execute($orderIds);
    $allProductItems = $stmtItems->fetchAll();
    
    // Group items by order_id
    $itemsByOrder = [];
    foreach ($allProductItems as $item) {
        $itemsByOrder[$item['order_id']][] = $item;
    }
    
    // Map items back to orders
    foreach ($orders as &$order) {
        $order['items'] = $itemsByOrder[$order['id']] ?? [];
        $order['total'] = (int)$order['total_amount'];
        $order['date'] = date('M d, Y', strtotime($order['created_at']));
    }
    
    echo json_encode($orders);
}

function updateOrderStatus($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['order_number'], $data['status'])) {
        echo json_encode(['error' => 'Missing fields']);
        return;
    }
    
    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE order_number = ?");
    if ($stmt->execute([$data['status'], $data['order_number']])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Update failed: ' . implode(" ", $stmt->errorInfo())]);
    }
}

function deleteOrder($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['order_number'])) {
        echo json_encode(['error' => 'Missing order number']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE orders SET is_deleted_by_admin = 1 WHERE order_number = ?");
        if ($stmt->execute([$data['order_number']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Delete failed']);
        }
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function addCategory($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['name'])) { echo json_encode(['error' => 'Name required']); return; }
    
    try {
        // Check if category name exists
        $check = $pdo->prepare("SELECT COUNT(*) FROM categories WHERE name = ?");
        $check->execute([$data['name']]);
        if ($check->fetchColumn() > 0) {
            echo json_encode(['error' => 'Category already exists']);
            return;
        }

        $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
        if ($stmt->execute([$data['name']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to add category']);
        }
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteUser($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['id'])) { echo json_encode(['error' => 'ID required']); return; }
    
    // Prevent deleting self? We already do this in JS, but good to have here too.
    // However, JS check is enough for now or we can check session user_id.
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    if ($stmt->execute([$data['id']])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to delete user']);
    }
}

function editUser($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['id'])) { echo json_encode(['error' => 'ID required']); return; }
    
    $fields = [];
    $params = [];
    
    if (isset($data['first_name'])) { $fields[] = "first_name = ?"; $params[] = $data['first_name']; }
    if (isset($data['last_name'])) { $fields[] = "last_name = ?"; $params[] = $data['last_name']; }
    if (isset($data['email'])) { $fields[] = "email = ?"; $params[] = $data['email']; }
    if (isset($data['role'])) { $fields[] = "role = ?"; $params[] = $data['role']; }
    if (isset($data['password']) && !empty($data['password'])) {
        $fields[] = "password_hash = ?";
        $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }
    
    if (empty($fields)) { echo json_encode(['error' => 'No fields to update']); return; }
    
    $params[] = $data['id'];
    $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    if ($stmt->execute($params)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Update failed']);
    }
}

function addUser($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['first_name'], $data['last_name'], $data['email'], $data['password'], $data['role'])) {
        echo json_encode(['error' => 'Missing fields']);
        return;
    }
    
    $hashed = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)");
    if ($stmt->execute([$data['first_name'], $data['last_name'], $data['email'], $hashed, $data['role']])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to add user']);
    }
}
function editCategory($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    $name = trim($data['name'] ?? '');
    $oldName = trim($data['old_name'] ?? '');
    if (!$name || !$oldName) {
        echo json_encode(['error' => 'Missing fields']);
        return;
    }
    
    try {
        // If name changed, check if new name already exists
        if ($name !== $oldName) {
            $check = $pdo->prepare("SELECT COUNT(*) FROM categories WHERE name = ?");
            $check->execute([$name]);
            if ($check->fetchColumn() > 0) {
                echo json_encode(['error' => 'A category with this name already exists']);
                return;
            }
        }

        $stmt = $pdo->prepare("UPDATE categories SET name = ? WHERE name = ?");
        if ($stmt->execute([$name, $oldName])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Update failed']);
        }
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteCategoryAction($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    $name = trim($data['name'] ?? '');
    if (!$name) {
        echo json_encode(['error' => 'Name required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get category ID
        $stmtId = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $stmtId->execute([$name]);
        $catId = $stmtId->fetchColumn();
        
        if ($catId) {
            // Delete specs for products in this category
            $pdo->prepare("DELETE FROM product_specs WHERE product_id IN (SELECT id FROM products WHERE category_id = ?)")->execute([$catId]);
            // Delete products in this category
            $pdo->prepare("DELETE FROM products WHERE category_id = ?")->execute([$catId]);
            // Delete category
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
            $stmt->execute([$catId]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['error' => 'Delete failed: ' . $e->getMessage()]);
    }
}

function saveProduct($pdo) {
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
        return;
    }

    $stmtCat = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
    $stmtCat->execute([$categoryName]);
    $categoryId = $stmtCat->fetchColumn();
    if (!$categoryId) {
        echo json_encode(['error' => 'Invalid category']);
        return;
    }

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
            return;
        }
    }

    try {
        if ($id) {
            $stmt = $pdo->prepare("UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image = ?, stock = ?, badge = ? WHERE id = ?");
            $stmt->execute([$categoryId, $name, $desc, $price, $imagePath, $stock, $badge, $id]);
            
            $pdo->prepare("DELETE FROM product_specs WHERE product_id = ?")->execute([$id]);
            foreach ($specs as $s) {
                $pdo->prepare("INSERT INTO product_specs (product_id, spec_value) VALUES (?, ?)")->execute([$id, $s]);
            }
        } else {
            $stmt = $pdo->prepare("INSERT INTO products (category_id, name, description, price, image, stock, badge) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$categoryId, $name, $desc, $price, $imagePath, $stock, $badge]);
            $newId = $pdo->lastInsertId();
            
            foreach ($specs as $s) {
                $pdo->prepare("INSERT INTO product_specs (product_id, spec_value) VALUES (?, ?)")->execute([$newId, $s]);
            }
        }
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function deleteProduct($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['id'])) { echo json_encode(['error' => 'ID required']); return; }
    
    try {
        $pdo->prepare("DELETE FROM product_specs WHERE product_id = ?")->execute([$data['id']]);
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        if ($stmt->execute([$data['id']])) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Failed to delete product']);
        }
    } catch (PDOException $e) {
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function setProductStock($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;
    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['id'], $data['stock'])) { echo json_encode(['error' => 'Missing fields']); return; }
    
    $stmt = $pdo->prepare("UPDATE products SET stock = ? WHERE id = ?");
    if ($stmt->execute([$data['stock'], $data['id']])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Update failed']);
    }
}
