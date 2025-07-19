<?php
// Incluir la conexión a la base de datos
require_once '../config/db-connection.php';

header('Content-Type: application/json');

// Obtener los datos del POST y sanitizar ligeramente
$feedback_type = isset($_POST['feedback_type']) ? trim($_POST['feedback_type']) : '';
$message = isset($_POST['feedback_text']) ? trim($_POST['feedback_text']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$uuid = isset($_POST['uuid']) ? trim($_POST['uuid']) : ''; // Campo UUID
$feedback_uuid = isset($_POST['feedback_uuid']) ? trim($_POST['feedback_uuid']) : ''; // Nuevo campo feedback_uuid

// --- INICIO DE LA VALIDACIÓN ESTRICTA ---

// 1. Validación de campos vacíos
if (empty($feedback_type) || empty($message) || empty($email) || empty($uuid) || empty($feedback_uuid)) {
    // Devuelve un error si algún campo está vacío.
    echo json_encode(['success' => false, 'message' => 'Por favor, completa todos los campos.']);
    exit;
}

// 2. Validación de formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // Devuelve un error si el email no tiene un formato válido.
    echo json_encode(['success' => false, 'message' => 'Por favor, introduce una dirección de correo electrónico válida.']);
    exit;
}

// 3. Validación de longitud máxima para prevenir sobrecarga.
define('MAX_EMAIL_LENGTH', 254);
define('MAX_MESSAGE_LENGTH', 5000);
define('MAX_UUID_LENGTH', 36);


if (strlen($email) > MAX_EMAIL_LENGTH) {
    echo json_encode(['success' => false, 'message' => 'La dirección de correo electrónico es demasiado larga.']);
    exit;
}

if (strlen($message) > MAX_MESSAGE_LENGTH) {
    echo json_encode(['success' => false, 'message' => 'El mensaje es demasiado largo. El límite es de ' . MAX_MESSAGE_LENGTH . ' caracteres.']);
    exit;
}

if (strlen($feedback_uuid) > MAX_UUID_LENGTH) {
    echo json_encode(['success' => false, 'message' => 'El UUID del feedback es demasiado largo.']);
    exit;
}


// 4. Validación de 'feedback_type' contra una lista blanca de valores permitidos.
$allowed_feedback_types = ['improvement', 'bug', 'contact_support', 'feature_request', 'other'];
if (!in_array($feedback_type, $allowed_feedback_types)) {
    // Si el tipo de feedback no está en la lista, la solicitud se rechaza.
    echo json_encode(['success' => false, 'message' => 'El tipo de comentario no es válido.']);
    exit;
}

// --- FIN DE LA VALIDACIÓN ESTRICTA ---


// --- INICIO DE LA MODIFICACIÓN: Límite diario ---
// Contar cuántos feedbacks ha enviado este UUID en las últimas 24 horas
$stmt_daily_check = $conn->prepare("SELECT COUNT(*) FROM feedback WHERE uuid = ? AND created_at >= NOW() - INTERVAL 1 DAY");
if ($stmt_daily_check === false) {
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta de límite diario.']);
    exit;
}
$stmt_daily_check->bind_param("s", $uuid);
$stmt_daily_check->execute();
$stmt_daily_check->bind_result($daily_count);
$stmt_daily_check->fetch();
$stmt_daily_check->close();

if ($daily_count >= 3) {
    echo json_encode(['success' => false, 'message' => 'Has alcanzado el límite de 3 comentarios por día.']);
    exit;
}
// --- FIN DE LA MODIFICACIÓN ---

// Comprobar si el UUID ha enviado feedback en los últimos 10 segundos
$stmt_check = $conn->prepare("SELECT COUNT(*) FROM feedback WHERE uuid = ? AND created_at > NOW() - INTERVAL 10 SECOND");
if ($stmt_check === false) {
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta de verificación: ' . $conn->error]);
    exit;
}
$stmt_check->bind_param("s", $uuid);
$stmt_check->execute();
$stmt_check->bind_result($count);
$stmt_check->fetch();
$stmt_check->close();

if ($count > 0) {
    echo json_encode(['success' => false, 'message' => 'Por favor, espera 10 segundos antes de enviar otro comentario.']);
    exit;
}


// Preparar la consulta para evitar inyección SQL
$stmt = $conn->prepare("INSERT INTO feedback (feedback_type, message, email, uuid, feedback_uuid) VALUES (?, ?, ?, ?, ?)");
if ($stmt === false) {
    echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta: ' . $conn->error]);
    exit;
}

// "sssss" significa que los cinco parámetros son strings
$stmt->bind_param("sssss", $feedback_type, $message, $email, $uuid, $feedback_uuid);

// Ejecutar y verificar
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => '¡Sugerencia enviada con éxito! Gracias por tus comentarios.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error al enviar la sugerencia: ' . $stmt->error]);
}

// Cerrar todo
$stmt->close();
$conn->close();
?>