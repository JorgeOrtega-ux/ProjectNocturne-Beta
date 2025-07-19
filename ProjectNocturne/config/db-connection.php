<?php

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "ProjectNocturne";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_errno) {
    error_log("Error de conexión ({$conn->connect_errno}): {$conn->connect_error}");
    http_response_code(500);
    die("Error al conectar con la base de datos. Intenta más tarde.");
}
?>