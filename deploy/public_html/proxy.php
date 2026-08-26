<?php
/**
 * ZURB Studio — PHP reverse proxy to the Node API (pm2 "zurb-api") on 127.0.0.1:3001.
 * Cloudways serves static files from public_html directly; /api/* is rewritten here by .htaccess.
 */
$nodeBase   = 'http://127.0.0.1:3001';
$requestUri = $_SERVER['REQUEST_URI'];
$targetUrl  = $nodeBase . $requestUri;
$method     = $_SERVER['REQUEST_METHOD'];

$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
$body = file_get_contents('php://input');

$skip = ['host', 'content-length', 'transfer-encoding', 'connection', 'upgrade', 'expect', 'accept-encoding'];
$headers = [];
foreach ($_SERVER as $key => $value) {
    if (substr($key, 0, 5) === 'HTTP_') {
        $name = str_replace('_', '-', substr($key, 5));
        if (!in_array(strtolower($name), $skip)) $headers[] = $name . ': ' . $value;
    }
}
if ($contentType !== '') $headers[] = 'Content-Type: ' . $contentType;
$headers[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
$headers[] = 'X-Forwarded-Proto: ' . ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 180);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
if ($method !== 'GET' && $method !== 'HEAD') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$responseHeaders = [];
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($ch, $line) use (&$responseHeaders) {
    $len = strlen($line);
    $parts = explode(':', $line, 2);
    if (count($parts) === 2) {
        $name = strtolower(trim($parts[0]));
        if (!in_array($name, ['transfer-encoding', 'connection', 'content-encoding', 'content-length'])) {
            $responseHeaders[] = trim($parts[0]) . ': ' . trim($parts[1]);
        }
    }
    return $len;
});

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API unavailable', 'detail' => curl_error($ch)]);
    curl_close($ch);
    exit;
}
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($status);
foreach ($responseHeaders as $h) header($h, false);
header('Cache-Control: no-store');
echo $response;
