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
    'edit_clock'
];

// --- Recuperación y Validación de Datos ---
$input = file_get_contents('php://input');
$events = json_decode($input, true);

if (!is_array($events)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid event data format.']);
    exit;
}

$conn->begin_transaction();

try {
    $sql = "INSERT INTO user_metrics (user_uuid, event_type, event_details, event_count, last_event_timestamp)
            VALUES (?, ?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE
            event_count = event_count + 1,
            last_event_timestamp = NOW()";

    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        throw new Exception('Error preparing the query: ' . $conn->error);
    }

    foreach ($events as $event) {
        $uuid = $event['uuid'] ?? null;
        $eventType = $event['eventType'] ?? '';
        $eventDetails = $event['eventDetails'] ?? '';

        // --- Validación Estricta de Entrada para cada evento ---
        if (
            !$uuid ||
            !$eventType ||
            !$eventDetails ||
            strlen($eventType) > MAX_EVENT_TYPE_LENGTH ||
            strlen($eventDetails) > MAX_EVENT_DETAILS_LENGTH ||
            !in_array($eventType, $allowed_event_types) // Comprueba si el tipo de evento está en la lista blanca
        ) {
            // Salta eventos inválidos, pero no falla todo el lote
            continue;
        }

        $stmt->bind_param("sss", $uuid, $eventType, $eventDetails);
        if (!$stmt->execute()) {
            throw new Exception('Error updating metric: ' . $stmt->error);
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'User metrics updated successfully.']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($stmt)) {
        $stmt->close();
    }
    $conn->close();
}
?>