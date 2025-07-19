<?php
require_once '../config/db-connection.php';

header('Content-Type: application/json');

// --- Configuración de Seguridad y Listas Blancas ---
define('MAX_EVENT_TYPE_LENGTH', 50);
define('MAX_EVENT_DETAILS_LENGTH', 255);

// Lista blanca de tipos de eventos permitidos. Solo se registrarán eventos de esta lista.
$allowed_event_types = [
    'interaction',
    'section_visit',
    'error',
    'performance',
    'create_alarm',
    'delete_alarm',
    'start_timer',
    'pause_timer',
    'reset_timer',
    'create_timer',
    'pin_timer',
    'delete_timer',
    'edit_timer',
    'record_lap',
    'export_laps',
    'reset_stopwatch',
    'stop_stopwatch',
    'start_stopwatch',
    'create_clock',
    'pin_clock',
    'edit_clock',
    'delete_clock'
];

// --- Obtención y Validación de Datos ---
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$uuid = $data['uuid'] ?? null;
$eventType = $data['eventType'] ?? '';
$eventDetails = $data['eventDetails'] ?? '';

// --- Validación Estricta de Entrada ---
if (
    !$uuid ||
    !$eventType ||
    !$eventDetails ||
    strlen($eventType) > MAX_EVENT_TYPE_LENGTH ||
    strlen($eventDetails) > MAX_EVENT_DETAILS_LENGTH ||
    !in_array($eventType, $allowed_event_types) // Comprueba si el tipo de evento está en la lista blanca
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de evento inválidos, faltantes o no permitidos.']);
    exit;
}

// La consulta se mantiene igual, ya que es segura gracias a las consultas preparadas.
$sql = "INSERT INTO user_metrics (user_uuid, event_type, event_details, event_count, last_event_timestamp)
        VALUES (?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
        event_count = event_count + 1,
        last_event_timestamp = NOW()";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta: ' . $conn->error]);
    exit;
}

// Vinculamos los tres parámetros a la consulta
$stmt->bind_param("sss", $uuid, $eventType, $eventDetails);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Métrica de usuario actualizada.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al actualizar la métrica: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>