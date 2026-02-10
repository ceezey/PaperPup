<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once __DIR__ . '/db.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Handle preflight (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Fallback for GET
$action = $_GET['action'] ?? '';

if (!$action) {
    http_response_code(400);
    echo json_encode(["error" => "No action specified"]);
    exit;
}

// Get the HTTP method (GET, POST, PUT, DELETE)
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {

    /* =====================
       AUTH
    ====================== */

    case 'login':
        login($conn);
        break;

    case 'register':
        register($conn);
        break;

    /* =====================
       USERS / PROFILES
    ====================== */

    case 'users':
        if ($method === 'GET') {
            getUser($conn);
        } elseif ($method === 'POST') {
            addUser($conn);
        }
        break;

    case 'updateUser':
        updateUser($conn);
        break;

    /* =====================
       RESOURCES
    ====================== */

    case 'getResources':
        getResources($conn);
        break;

    case 'createResource':
        createResource($conn);
        break;

    case 'updateResource':
        updateResource($conn);
        break;

    case 'deleteResource':
        deleteResource($conn);
        break;

    case 'getCategories':
        getCategories($conn);
        break;

    case 'getUserResources':
        getUserResources($conn);
        break;

    /* =====================
       UPVOTES (LIKES)
    ====================== */

    case 'toggleLike':
        toggleLike($conn);
        break;

    /* =====================
       COMMENTS
    ====================== */

    case 'getComments':
        getComments($conn);
        break;

    case 'addComment':
        addComment($conn);
        break;

    case 'updateComment':
        updateComment($conn);
        break;

    case 'deleteComment':
        deleteComment($conn);
        break;

    default:
        respond(404, ["error" => "Unknown action"]);
}

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

function getJsonInput(): array
{
    return json_decode(file_get_contents("php://input"), true) ?? [];
}

function respond(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

/*
|--------------------------------------------------------------------------
| AUTH (STUBS)
|--------------------------------------------------------------------------
| Replace logic with real DB queries later
*/

function login(PDO $conn)
{
    $data = getJsonInput();

    if (empty($data['email']) || empty($data['password'])) {
        respond(400, ["error" => "Email and password required"]);
    }

    $stmt = $conn->prepare("
        SELECT u.id, u.name, u.email, u.password_hash, c.code AS course_code
        FROM users u
        JOIN courses c ON u.course_id = c.id
        WHERE u.email = :email AND u.is_deleted = 0
        LIMIT 1
    ");
    $stmt->execute(['email' => $data['email']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($data['password'], $user['password_hash'])) {
        respond(401, ["error" => "Invalid credentials"]);
    }

    respond(200, [
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $user['email'],
            "course_code" => $user['course_code'],
        ]
    ]);
}

function register(PDO $conn)
{
    $data = getJsonInput();

    if (empty($data['name']) || empty($data['email']) || empty($data['password']) || empty($data['course_code'])) {
        respond(400, ["error" => "Missing required fields"]);
    }

    // Lookup course by code
    $stmt = $conn->prepare("SELECT id FROM courses WHERE code = :code LIMIT 1");
    $stmt->execute(['code' => $data['course_code']]);
    $course = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$course) {
        respond(400, ["error" => "Course not found"]);
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO users (name, email, password_hash, course_id)
            VALUES (:name, :email, :password, :course_id)
        ");

        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'course_id' => $course['id'],
        ]);

        $userId = $conn->lastInsertId();

        respond(201, [
            "user" => [
                "id" => $userId,
                "name" => $data['name'],
                "email" => $data['email'],
                "course_code" => $data['course_code'],
            ]
        ]);
    } catch (PDOException $e) {
        respond(400, ["error" => "Email already exists"]);
    }
}

/*
|--------------------------------------------------------------------------
| USERS / PROFILE
|--------------------------------------------------------------------------
*/

function getUser(PDO $conn)
{
    $id = $_GET['id'] ?? null;
    if (!$id) respond(400, ["error" => "User id required"]);

    $stmt = $conn->prepare("
        SELECT 
            u.id, 
            u.name,    
            u.email, 
            c.name AS major, 
            c.code AS course_code
        FROM users u
        LEFT JOIN courses c ON u.course_id = c.id
        WHERE u.id = :id AND u.is_deleted = 0
        LIMIT 1
    ");
    $stmt->execute(['id' => $id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) respond(404, ["error" => "User not found"]);

    respond(200, $user);
}


function addUser(PDO $conn)
{
    $data = getJsonInput();

    $stmt = $conn->prepare("
        INSERT INTO users (name, email, password_hash, course_id)
        VALUES (:name, :email, :password_hash, :course_id)
    ");
    $stmt->execute([
        'name' => $data['name'],
        'email' => $data['email'],
        'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
        'course_id' => $data['course_id']
    ]);

    respond(201, ["message" => "User created"]);
}

function updateUser(PDO $conn)
{
    $data = getJsonInput();

    if (empty($data['id'])) {
        respond(400, ["error" => "User ID required"]);
    }

    // If updating major, we need to map it to a course_id
    $courseId = null;
    if (!empty($data['major'])) {
        // Try to find the course by name or code
        $stmt = $conn->prepare("SELECT id FROM courses WHERE name = :name OR code = :code LIMIT 1");
        $stmt->execute(['name' => $data['major'], 'code' => $data['major']]);
        $course = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($course) {
            $courseId = $course['id'];
        }
    }

    // Build update query dynamically
    $fields = [];
    $params = ['id' => $data['id']];
    if (!empty($data['name'])) {
        $fields[] = "name = :name";
        $params['name'] = $data['name'];
    }
    if ($courseId) {
        $fields[] = "course_id = :course_id";
        $params['course_id'] = $courseId;
    }

    // Handle password update if provided
    if (!empty($data['password'])) {
        $fields[] = "password_hash = :password_hash";
        $params['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    if (empty($fields)) {
        respond(400, ["error" => "Nothing to update"]);
    }

    $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);

    // Return the updated user info
    $stmt = $conn->prepare("
        SELECT 
            u.id, 
            u.name, 
            u.email, 
            c.name AS major, 
            c.code AS course_code
        FROM users u
        LEFT JOIN courses c ON u.course_id = c.id
        WHERE u.id = :id
        LIMIT 1
    ");
    $stmt->execute(['id' => $data['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    respond(200, $user);
}

/*
|--------------------------------------------------------------------------
| RESOURCES
|--------------------------------------------------------------------------
*/

function getResources(PDO $conn)
{
    $id = $_GET['id'] ?? null;
    $input = getJsonInput();
    $userId = isset($input['userId']) ? intval($input['userId']) : null;

    $sql = "
        SELECT 
            r.id,
            r.title,
            r.description,
            r.link AS url,
            r.is_public,
            r.date_added AS dateAdded,
            r.category_id,
            u.id AS authorId,
            u.name AS authorName,
            co.code AS course_code,
            c.name AS category,
            GROUP_CONCAT(l.user_id) AS upvotes
        FROM resources r
        LEFT JOIN users u ON r.author_id = u.id
        LEFT JOIN courses co ON u.course_id = co.id
        LEFT JOIN categories c ON r.category_id = c.id
        LEFT JOIN likes l ON l.resource_id = r.id
        WHERE r.is_deleted = 0
    ";

    if ($id) {
        $sql .= " AND r.id = :id";
    } else if ($userId) {
        // Show public resources + user's own resources (public and private)
        $sql .= " AND (r.is_public = 1 OR r.author_id = :userId)";
    } else {
        // If no userId provided, show only public resources
        $sql .= " AND r.is_public = 1";
    }

    $sql .= " GROUP BY r.id ORDER BY r.date_added DESC";

    try {
        $stmt = $conn->prepare($sql);
        if ($id) {
            $stmt->execute(['id' => $id]);
        } else if ($userId) {
            $stmt->execute(['userId' => $userId]);
        } else {
            $stmt->execute();
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$r) {
            $r['authorName'] = $r['authorName'] ?? 'Unknown';
            $r['upvotes'] = $r['upvotes'] ? explode(',', $r['upvotes']) : [];
        }

        // if fetching by id, return single object
        if ($id) {
            respond(200, $rows[0] ?? null);
        } else {
            respond(200, $rows);
        }
    } catch (PDOException $e) {
        respond(500, ['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function createResource(PDO $conn)
{
    $data = getJsonInput();

    if (
        empty($data['title']) ||
        empty($data['url']) ||
        empty($data['category_id']) ||
        empty($data['user_id'])
    ) {
        respond(400, ["error" => "Missing required fields (title, url, category_id, user_id)"]);
    }

    $authorId = intval($data['user_id']);

    // Get the author's course_id
    $stmt = $conn->prepare("SELECT course_id FROM users WHERE id = :id LIMIT 1");
    $stmt->execute(['id' => $authorId]);
    $courseId = $stmt->fetchColumn();

    if (!$courseId) {
        respond(400, ["error" => "Invalid user or user has no course assigned"]);
    }

    $stmt = $conn->prepare("
        INSERT INTO resources (
            title,
            description,
            link,
            category_id,
            course_id,
            author_id,
            is_public
        ) VALUES (
            :title,
            :description,
            :link,
            :category_id,
            :course_id,
            :author_id,
            :is_public
        )
    ");

    $stmt->execute([
        'title'       => $data['title'],
        'description' => $data['description'] ?? '',
        'link'        => $data['url'],
        'category_id' => (int)$data['category_id'],
        'course_id'   => $courseId,
        'author_id'   => $authorId,
        'is_public'   => !empty($data['isPublic']) ? 1 : 0,
    ]);

    respond(201, [
        "success" => true,
        "resource_id" => $conn->lastInsertId()
    ]);
}

function updateResource(PDO $conn)
{
    $data = getJsonInput();

    if (empty($data['resource_id'])) {
        respond(400, ["error" => "resource_id required"]);
    }

    $fields = [];
    $params = ['resource_id' => $data['resource_id']];

    if (!empty($data['title'])) {
        $fields[] = "title = :title";
        $params['title'] = $data['title'];
    }
    if (!empty($data['description'])) {
        $fields[] = "description = :description";
        $params['description'] = $data['description'];
    }
    if (!empty($data['url'])) {
        $fields[] = "link = :link";
        $params['link'] = $data['url'];
    }
    if (!empty($data['category_id'])) {
        $fields[] = "category_id = :category_id";
        $params['category_id'] = $data['category_id'];
    }
    if (isset($data['isPublic'])) {
        $fields[] = "is_public = :is_public";
        $params['is_public'] = $data['isPublic'] ? 1 : 0;
    }

    if (empty($fields)) {
        respond(400, ["error" => "Nothing to update"]);
    }

    $sql = "UPDATE resources SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :resource_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);

    $stmt = $conn->prepare("
        SELECT r.id, r.title, r.description, r.link AS url, r.category_id, c.name AS category, r.is_public
        FROM resources r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.id = :id
    ");
    $stmt->execute(['id' => $data['resource_id']]);
    $resource = $stmt->fetch(PDO::FETCH_ASSOC);

    respond(200, $resource);
}


function deleteResource(PDO $conn)
{
    $data = getJsonInput();

    $stmt = $conn->prepare("
        UPDATE resources SET is_deleted = 1 WHERE id = :resource_id
    ");
    $stmt->execute(['resource_id' => $data['resource_id']]);

    respond(200, ["message" => "Resource deleted"]);
}

function getCategories(PDO $conn)
{
    try {
        $stmt = $conn->query("SELECT id, name FROM categories ORDER BY id ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respond(200, $categories);
    } catch (Exception $e) {
        respond(500, ["error" => "Failed to fetch categories"]);
    }
}

function getUserResources(PDO $conn)
{
    $userId = $_GET['userId'] ?? null;
    if (!$userId) respond(400, ["error" => "userId required"]);

    $stmt = $conn->prepare("
        SELECT 
            r.id,
            r.title,
            r.description,
            r.link AS url,
            c.name AS category
        FROM resources r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.author_id = :userId AND r.is_deleted = 0
        ORDER BY r.date_added DESC
    ");
    $stmt->execute(['userId' => $userId]);
    respond(200, $stmt->fetchAll(PDO::FETCH_ASSOC));
}

/*
|--------------------------------------------------------------------------
| UPVOTES / LIKES
|--------------------------------------------------------------------------
*/

function toggleLike(PDO $conn)
{
    $data = getJsonInput();

    if (empty($data['user_id']) || empty($data['resource_id'])) {
        respond(400, ["error" => "user_id and resource_id required"]);
    }

    try {
        $stmt = $conn->prepare("SELECT id FROM likes WHERE user_id = :user_id AND resource_id = :resource_id");
        $stmt->execute(['user_id' => $data['user_id'], 'resource_id' => $data['resource_id']]);

        if ($stmt->fetch()) {
            $conn->prepare("DELETE FROM likes WHERE user_id = :user_id AND resource_id = :resource_id")
                ->execute(['user_id' => $data['user_id'], 'resource_id' => $data['resource_id']]);
        } else {
            $conn->prepare("INSERT INTO likes (user_id, resource_id) VALUES (:user_id, :resource_id)")
                ->execute(['user_id' => $data['user_id'], 'resource_id' => $data['resource_id']]);
        }

        // Fetch the updated resource with current upvotes
        $stmt = $conn->prepare("
            SELECT 
                r.id,
                r.title,
                r.description,
                r.link AS url,
                r.is_public,
                r.date_added AS dateAdded,
                u.id AS authorId,
                u.name AS authorName,
                c.name AS category,
                GROUP_CONCAT(l.user_id) AS upvotes
            FROM resources r
            LEFT JOIN users u ON r.author_id = u.id
            LEFT JOIN categories c ON r.category_id = c.id
            LEFT JOIN likes l ON l.resource_id = r.id
            WHERE r.id = :resource_id AND r.is_deleted = 0
            GROUP BY r.id
        ");
        $stmt->execute(['resource_id' => $data['resource_id']]);
        $resource = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($resource) {
            $upvotesRaw = $resource['upvotes'];
            error_log("DEBUG toggleLike - Raw upvotes: " . var_export($upvotesRaw, true));

            // Safely convert upvotes
            if (!empty($upvotesRaw) && $upvotesRaw !== null) {
                $resource['upvotes'] = array_map('trim', explode(',', $upvotesRaw));
            } else {
                $resource['upvotes'] = [];
            }

            error_log("DEBUG toggleLike - Parsed upvotes: " . var_export($resource['upvotes'], true));
            error_log("DEBUG toggleLike - About to respond with: " . json_encode($resource));

            $resource['authorId'] = $resource['authorId'];
            $resource['dateAdded'] = $resource['dateAdded'];
            $resource['is_public'] = (int)$resource['is_public'];
            // Ensure category_id is set (get it from the database)
            $stmt = $conn->prepare("SELECT category_id FROM resources WHERE id = :id");
            $stmt->execute(['id' => $data['resource_id']]);
            $categoryResult = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($categoryResult) {
                $resource['category_id'] = $categoryResult['category_id'];
            }
            respond(200, $resource);
        } else {
            respond(200, ["message" => "Like toggled"]);
        }
    } catch (Exception $e) {
        respond(500, ["error" => "Failed to toggle like: " . $e->getMessage()]);
    }
}

/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

function getComments(PDO $conn)
{
    $data = getJsonInput();
    $id = $_GET['resourceId'] ?? $data['resource_id'] ?? null;

    if (!$id) respond(400, ["error" => "resource_id required"]);

    $stmt = $conn->prepare("
        SELECT 
            c.id,
            c.resource_id AS resourceId,
            c.user_id AS userId,
            u.name AS userName,
            c.content AS text,
            c.created_at AS date
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.resource_id = :id AND c.is_deleted = 0
        ORDER BY c.created_at DESC
    ");
    $stmt->execute(['id' => $id]);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ensure userId is string for consistency with frontend
    foreach ($comments as &$comment) {
        $comment['userId'] = (string)$comment['userId'];
    }

    respond(200, $comments);
}

function addComment(PDO $conn)
{
    $data = getJsonInput();

    $stmt = $conn->prepare("INSERT INTO comments (resource_id, user_id, content) VALUES (:resource_id, :user_id, :content)");
    $stmt->execute($data);

    $commentId = $conn->lastInsertId();
    $stmt = $conn->prepare("SELECT c.id, c.resource_id AS resourceId, c.user_id AS userId, u.name AS userName, c.content AS text, c.created_at AS date
                            FROM comments c
                            JOIN users u ON c.user_id = u.id
                            WHERE c.id = :id");
    $stmt->execute(['id' => $commentId]);
    $comment = $stmt->fetch(PDO::FETCH_ASSOC);

    respond(201, $comment);
}

function updateComment(PDO $conn)
{
    $data = getJsonInput();

    if (empty($data['comment_id']) || empty($data['content'])) {
        respond(400, ["error" => "Comment ID and content required"]);
    }

    try {
        $stmt = $conn->prepare("
            UPDATE comments SET content = :content, created_at = NOW() WHERE id = :comment_id
        ");
        $result = $stmt->execute([
            'content' => $data['content'],
            'comment_id' => $data['comment_id']
        ]);

        if (!$result) {
            error_log("UPDATE failed for comment: " . $data['comment_id']);
            respond(500, ["error" => "Failed to update comment in database"]);
        }

        // Return the updated comment
        $stmt = $conn->prepare("
            SELECT c.id, c.content AS text, c.created_at AS date, u.id AS userId, u.name AS userName
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = :id");
        $stmt->execute(['id' => $data['comment_id']]);
        $comment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$comment) {
            respond(404, ["error" => "Comment not found"]);
        }

        // Ensure userId is string
        $comment['userId'] = (string)$comment['userId'];
        respond(200, $comment);
    } catch (Exception $e) {
        error_log("updateComment error: " . $e->getMessage());
        respond(500, ["error" => "Failed to update comment: " . $e->getMessage()]);
    }
}

function deleteComment(PDO $conn)
{
    $data = getJsonInput();

    $stmt = $conn->prepare("
        UPDATE comments SET is_deleted = 1 WHERE id = :comment_id
    ");
    $stmt->execute(['comment_id' => $data['comment_id']]);

    respond(200, ["message" => "Comment deleted"]);
}
