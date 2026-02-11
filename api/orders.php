<?php
header("Content-Type: application/json");
require_once '../config/db.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_SESSION['user_id'];

if ($method === 'GET') {
    // Get user orders
    try {
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $stmtItems = $pdo->prepare("
                SELECT oi.*, p.name, p.image 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            ");
            $stmtItems->execute([$order['id']]);
            $order['items'] = $stmtItems->fetchAll();
            $order['total'] = (int)$order['total_amount']; // Cast for frontend consistency
        }
        echo json_encode($orders);
    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error']);
    }

} elseif ($method === 'POST') {
    // Create new order
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['items']) || !is_array($input['items'])) {
        echo json_encode(['error' => 'Invalid order data']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // Calculate Order ID components
        $year = date("Y");
        $monthIndex = date("n") - 1; // 0-11
        $letters = range('A', 'L'); // A=Jan, B=Feb... wait, user wants First Letter of Month Name
        // User Request: "first letter of the month the order was placed"
        // Jan=J, Feb=F, Mar=M, Apr=A, May=M, Jun=J, Jul=J, Aug=A, Sep=S, Oct=O, Nov=N, Dec=D
        $monthName = date("F");
        $monthLetter = strtoupper(substr($monthName, 0, 1));
        
        $totalQuantity = 0;
        $categoryFirstLetters = [];
        $orderItemsData = [];
        $total = 0;

        foreach ($input['items'] as $item) {
            // Join categories to get name
            $stmtP = $pdo->prepare("
                SELECT p.price, p.category_id, p.name, c.name as category_name 
                FROM products p 
                JOIN categories c ON p.category_id = c.id 
                WHERE p.id = ?
            ");
            $stmtP->execute([$item['id']]);
            $product = $stmtP->fetch();
            
            if ($product) {
                $itemTotal = $product['price'] * $item['quantity'];
                $total += $itemTotal;
                $totalQuantity += $item['quantity'];
                
                // Get first letter of category name
                if (!empty($product['category_name'])) {
                    $categoryFirstLetters[] = strtoupper(substr($product['category_name'], 0, 1));
                }
                
                $orderItemsData[] = [
                    'product_id' => $item['id'],
                    'quantity' => $item['quantity'],
                    'price' => $product['price'],
                    'name' => $product['name']
                ];
            }
        }

        // Format Category Letters: Unique, Sorted, Joined
        $categoryFirstLetters = array_unique($categoryFirstLetters);
        sort($categoryFirstLetters);
        $catLettersStr = implode('', $categoryFirstLetters);
        
        // Order ID: ORD-[Year][CategoryLetters][MonthLetter][ProductCount]-[Random4]
        // Example: ORD-2026SWF2-5921
        $randomSuffix = rand(1000, 9999);
        $orderNumber = "ORD-{$year}{$catLettersStr}{$monthLetter}{$totalQuantity}-{$randomSuffix}";

        // Add shipping (logic: free > 250000)
        // Determine shipping based on subtotal
        $subtotal = 0;
        foreach ($orderItemsData as $item) {
            $subtotal += $item['price'] * $item['quantity'];
        }
        
        $shipping = 0; // Paid on delivery
        // $tax = $subtotal * 0.08;
        $finalTotal = $subtotal;

        // Shipping details
        $sPhone = isset($input['shipping_phone']) ? $input['shipping_phone'] : null;
        $sAddr = isset($input['shipping_address']) ? $input['shipping_address'] : null;
        $sCity = isset($input['shipping_city']) ? $input['shipping_city'] : null;
        $sRegion = isset($input['shipping_region']) ? $input['shipping_region'] : null;
        $sZip = isset($input['shipping_zip']) ? $input['shipping_zip'] : null;

        $stmtOrder = $pdo->prepare("INSERT INTO orders (
            user_id, order_number, total_amount, status, 
            shipping_phone, shipping_address, shipping_city, shipping_region, shipping_zip
        ) VALUES (?, ?, ?, 'Processing', ?, ?, ?, ?, ?)");
        
        $stmtOrder->execute([
            $userId, $orderNumber, $finalTotal, 
            $sPhone, $sAddr, $sCity, $sRegion, $sZip
        ]);
        $orderId = $pdo->lastInsertId();

        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
        foreach ($orderItemsData as $item) {
            $stmtItem->execute([$orderId, $item['product_id'], $item['quantity'], $item['price']]);
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'orderNumber' => $orderNumber, 'total' => $finalTotal]);

    } catch (Exception $e) {
        $pdo->rollBack();
        // Check for duplicate entry on order_number
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
             echo json_encode(['error' => 'Order creation failed: Duplicate Order ID. Please try again.']); // Simple retry suggestion
        } else {
             echo json_encode(['error' => 'Order creation failed: ' . $e->getMessage()]);
        }
    }
}
