<?php
$host = "localhost";
$db_name = "paperpup_db";
$port = 3307;  
$username = "root";      
$password = "";          

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;port=$port;charset=utf8", $username, $password);
    // Set PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

?>
