<?php
require_once '../config/db-connection.php';

header('Content-Type: application/json');

// --- Configuración de Límites de Longitud ---
define('MAX_UUID_LENGTH', 36);
define('MAX_COUNTRY_LENGTH', 100);
define('MAX_OS_LENGTH', 50);
define('MAX_BROWSER_LENGTH', 50);
define('MAX_VERSION_LENGTH', 20);
define('MAX_LANGUAGE_LENGTH', 10);

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// --- Sanitización, Validación de Longitud y Asignación ---
// Se usa substr() para truncar los datos si exceden el límite.
// Se usa htmlspecialchars() como defensa en profundidad contra XSS.
$uuid = substr($data['uuid'] ?? '', 0, MAX_UUID_LENGTH);
$country = htmlspecialchars(substr($data['country'] ?? 'Unknown', 0, MAX_COUNTRY_LENGTH), ENT_QUOTES, 'UTF-8');
$os = htmlspecialchars(substr($data['os'] ?? 'Unknown', 0, MAX_OS_LENGTH), ENT_QUOTES, 'UTF-8');
$browser = htmlspecialchars(substr($data['browser'] ?? 'Unknown', 0, MAX_BROWSER_LENGTH), ENT_QUOTES, 'UTF-8');
$browser_version = htmlspecialchars(substr($data['browser_version'] ?? 'Unknown', 0, MAX_VERSION_LENGTH), ENT_QUOTES, 'UTF-8');
$language = htmlspecialchars(substr($data['language'] ?? 'Unknown', 0, MAX_LANGUAGE_LENGTH), ENT_QUOTES, 'UTF-8');

if (!$uuid) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'UUID es requerido.']);
    exit;
}

// --- Lógica de la Base de Datos ---

// PASO 1: Insertar o actualizar el perfil principal del usuario
$sql_activity = "INSERT INTO user_activity (uuid, country, operating_system, browser, browser_version, preferred_language, last_activity)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                 last_activity = NOW(),
                 country = VALUES(country),
                 operating_system = VALUES(operating_system),
                 browser = VALUES(browser),
                 browser_version = VALUES(browser_version),
                 preferred_language = VALUES(preferred_language)";

$stmt_activity = $conn->prepare($sql_activity);

if ($stmt_activity === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta de actividad: ' . $conn->error]);
    exit;
}

$stmt_activity->bind_param("ssssss", $uuid, $country, $os, $browser, $browser_version, $language);

if ($stmt_activity->execute()) {
    // Si affected_rows es 1, se insertó una nueva fila (usuario nuevo).
    $is_new_user = ($conn->affected_rows === 1);

    // PASO 2: Si es un usuario nuevo, crear su registro de métricas inmediatamente
    if ($is_new_user) {
        $sql_metrics = "INSERT IGNORE INTO user_metrics (user_uuid) VALUES (?)";
        $stmt_metrics = $conn->prepare($sql_metrics);
        
        if ($stmt_metrics) {
            $stmt_metrics->bind_param("s", $uuid);
            $stmt_metrics->execute();
            $stmt_metrics->close();
        }
    }
    
    $status = $is_new_user ? 'created' : 'updated';
    $http_code = ($status === 'created') ? 201 : 200;
    http_response_code($http_code);
    echo json_encode(['success' => true, 'status' => $status]);

} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al registrar la actividad del usuario.']);
}

$stmt_activity->close();
$conn->close();
?>