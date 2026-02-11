<?php
header("Content-Type: application/json");
require_once '../config/db.php';

session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'register':
        if ($method === 'POST') register($pdo);
        break;
    case 'login':
        if ($method === 'POST') login($pdo);
        break;
    case 'logout':
        logout();
        break;
    case 'check_session':
        check_session();
        break;
    case 'update_profile':
        update_profile($pdo);
        break;
    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}

function register($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['first_name'], $data['last_name'], $data['email'], $data['password'])) {
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }

    // Check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
        echo json_encode(['error' => 'Email already registered']);
        return;
    }

    $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
    // Explicitly set role to customer unless specific logic overrides (secure by default)
    $role = 'customer'; 
    
    // Special case for the admin email mentioned in original script (if desired)
    // if (strtolower($data['email']) === 'anna@gmail.com') $role = 'admin';

    $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)");
    if ($stmt->execute([$data['first_name'], $data['last_name'], $data['email'], $hashed_password, $role])) {
        $userId = $pdo->lastInsertId();
        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = $role;
        $_SESSION['name'] = $data['first_name'];
        
        echo json_encode([
            'success' => true, 
            'user' => [
                'id' => $userId,
                'firstName' => $data['first_name'],
                'lastName' => $data['last_name'],
                'email' => $data['email'],
                'role' => $role
            ]
        ]);
    } else {
        echo json_encode(['error' => 'Registration failed']);
    }
}

function login($pdo) {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['email'], $data['password'])) {
        echo json_encode(['error' => 'Missing login credentials']);
        return;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if ($user && password_verify($data['password'], $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['name'] = $user['first_name'];

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    } else {
        echo json_encode(['error' => 'Invalid email or password']);
    }
}

function logout() {
    session_destroy();
    echo json_encode(['success' => true]);
}

function check_session() {
    if (isset($_SESSION['user_id'])) {
        require_once '../config/db.php';
        // Better to fetch full user info to ensure frontend has all metadata
        global $pdo;
        $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if ($user) {
            echo json_encode([
                'logged_in' => true,
                'user' => [
                    'id' => $user['id'],
                    'role' => $user['role'],
                    'firstName' => $user['first_name'],
                    'lastName' => $user['last_name'],
                    'email' => $user['email']
                ]
            ]);
        } else {
            session_destroy();
            echo json_encode(['logged_in' => false]);
        }
    } else {
        echo json_encode(['logged_in' => false]);
    }
}

function update_profile($pdo) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['error' => 'Not logged in']);
        return;
    }
    
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $_SESSION['user_id'];
    
    $firstName = $data['first_name'] ?? '';
    $lastName = $data['last_name'] ?? '';
    $email = $data['email'] ?? '';
    $currentPass = $data['current_password'] ?? '';
    $newPass = $data['new_password'] ?? '';
    
    if (empty($firstName) || empty($lastName) || empty($email)) {
        echo json_encode(['error' => 'Fields required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if ($newPass && (!password_verify($currentPass, $user['password_hash']))) {
            echo json_encode(['error' => 'Current password incorrect']);
            return;
        }
        
        $sql = "UPDATE users SET first_name = ?, last_name = ?, email = ? ";
        $params = [$firstName, $lastName, $email];
        
        if ($newPass) {
            $sql .= ", password_hash = ? ";
            $params[] = password_hash($newPass, PASSWORD_DEFAULT);
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $userId;
        
        $stmtUpdate = $pdo->prepare($sql);
        $stmtUpdate->execute($params);
        
        // Update session
        $_SESSION['name'] = $firstName;
        
        echo json_encode([
            'success' => true, 
            'user' => [
                'id' => $userId,
                'role' => $_SESSION['role'],
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $email
            ]
        ]);
        
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['error' => 'Email already in use']);
        } else {
            echo json_encode(['error' => 'Update failed: ' . $e->getMessage()]);
        }
    }
}
