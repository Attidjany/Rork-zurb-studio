<?php
/**
 * ZURB Studio — nginx falls back here for every path that is not a real file.
 *   /api/*  → Node API (proxy.php)
 *   else    → the single-page app shell (app.html, served with no-store so deploys are picked up)
 */
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path === '/api' || strpos($path, '/api/') === 0) {
    require __DIR__ . '/proxy.php';
    exit;
}
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
readfile(__DIR__ . '/app.html');
