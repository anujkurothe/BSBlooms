<?php
declare(strict_types=1);

/**
 * BSBlooms PHP Backend API for Hostinger Shared Web Hosting (public_html).
 * Mirrors server.ts endpoints identically with bcrypt password hashing,
 * HMAC-SHA256 HttpOnly session cookies / Bearer tokens, and atomic JSON storage.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

const BSB_SESSION_COOKIE = 'bsb_admin_session';
const BSB_SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const BSB_DEFAULT_PASSWORD = 'admin123';

$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
$dbFile = $dataDir . DIRECTORY_SEPARATOR . 'bsblooms-db.json';

function bsb_json_response(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function bsb_base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function bsb_base64url_decode(string $data): string {
    $remainder = strlen($data) % 4;
    if ($remainder > 0) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    $decoded = base64_decode(strtr($data, '-_', '+/'), true);
    return $decoded === false ? '' : $decoded;
}

function bsb_now_iso(): string {
    return gmdate('Y-m-d\TH:i:s\Z');
}

function bsb_default_store_settings(): array {
    return [
        'shopNameEn' => 'BSBlooms',
        'phone' => '+91 96301 77446',
        'whatsapp' => '919630177446',
        'locationEn' => 'Direct Greenhouse Dispatch',
        'hoursEn' => 'Daily · 6:00 AM – 8:00 PM',
        'updatedAt' => bsb_now_iso(),
    ];
}

function bsb_seed_flowers(): array {
    $now = bsb_now_iso();
    return [
        [
            'id' => 'gerbera-shimmer',
            'orderIndex' => 0,
            'nameEn' => 'Shimmer',
            'color' => 'White-Pink',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard · Semi-double',
            'breederCode' => 'Shimmer · VBN 102468',
            'stemLength' => '60 cm',
            'extraSpecEn' => 'Diameter 10–12 cm · Vase life 12–14 days · Bicolour white-pink petals',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/shimmer.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-sita',
            'orderIndex' => 1,
            'nameEn' => 'Sita',
            'color' => 'White',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard · Single',
            'breederCode' => 'Pole Star · VBN 123369',
            'stemLength' => '65 cm',
            'extraSpecEn' => 'Diameter 12–14 cm · Vase life 15–17 days · Pure white petals with dark center',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/pole-star.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-pre-intenzz',
            'orderIndex' => 2,
            'nameEn' => 'Pre-Intenzz',
            'color' => 'Light Pink',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard · Semi-double',
            'breederCode' => 'Pregetenz',
            'stemLength' => '60 – 65 cm',
            'extraSpecEn' => 'Diameter 11–12 cm · Soft luminous pink petals with contrasting black center',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/pre-intenzz.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-manjunath',
            'orderIndex' => 3,
            'nameEn' => 'Manjunath',
            'color' => 'Dark Pink',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard',
            'breederCode' => 'Hilaward',
            'stemLength' => '60 – 65 cm',
            'extraSpecEn' => 'Soil 230–250 cm · Substrate 290–310 cm · Rich deep pink with black center',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/award.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-lyon',
            'orderIndex' => 4,
            'nameEn' => 'Lyon',
            'color' => 'Yellow',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard',
            'breederCode' => 'Hilyon',
            'stemLength' => '60 cm',
            'extraSpecEn' => 'Diameter 12–14 cm · Warm golden yellow bloom with high greenhouse yield',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/brilliance.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-sisco',
            'orderIndex' => 5,
            'nameEn' => 'Sisco',
            'color' => 'Yellow',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard',
            'breederCode' => 'Sisco · VBN 115980',
            'stemLength' => '55 – 60 cm',
            'extraSpecEn' => 'Diameter 10–12 cm · RHS 002A bright yellow with signature fresh green center',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/sisco.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-ankur',
            'orderIndex' => 6,
            'nameEn' => 'Ankur',
            'color' => 'Red',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard · Semi-double',
            'breederCode' => 'Ankur · VBN 117993',
            'stemLength' => '60 cm',
            'extraSpecEn' => 'Diameter 11–13 cm · Vase life 15–17 days · Deep crimson red with black center',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/crimson-red.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
        [
            'id' => 'gerbera-capella',
            'orderIndex' => 7,
            'nameEn' => 'Capella',
            'color' => 'Orange',
            'cropEn' => 'Gerbera',
            'typeEn' => 'Standard · Semi-double',
            'breederCode' => 'Capella · VBN 119430',
            'stemLength' => '60 cm',
            'extraSpecEn' => 'Diameter 12–14 cm · Vase life 14–16 days · Vibrant orange petals with black center',
            'availability' => 'in_stock',
            'photos' => ['/assets/blooms/capella.jpg'],
            'createdAt' => $now,
            'updatedAt' => $now,
        ],
    ];
}

function bsb_sort_flowers(array $flowers): array {
    usort($flowers, static function (array $a, array $b): int {
        $orderA = isset($a['orderIndex']) ? (int)$a['orderIndex'] : 9999;
        $orderB = isset($b['orderIndex']) ? (int)$b['orderIndex'] : 9999;
        if ($orderA !== $orderB) {
            return $orderA <=> $orderB;
        }
        return strcmp((string)($a['nameEn'] ?? ''), (string)($b['nameEn'] ?? ''));
    });
    return array_values($flowers);
}

function bsb_ensure_data_dir(string $dataDir): void {
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0755, true);
    }
    $htaccessPath = $dataDir . DIRECTORY_SEPARATOR . '.htaccess';
    if (!file_exists($htaccessPath)) {
        @file_put_contents(
            $htaccessPath,
            "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n"
        );
    }
}

function bsb_save_db(string $dataDir, string $dbFile, array $db): void {
    bsb_ensure_data_dir($dataDir);
    $encoded = json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        bsb_json_response(500, ['error' => 'Failed to encode database.']);
    }
    $tmp = $dbFile . '.' . getmypid() . '.' . uniqid('', true) . '.tmp';
    if (@file_put_contents($tmp, $encoded, LOCK_EX) === false) {
        bsb_json_response(500, ['error' => 'Unable to write data directory. Check folder permissions on public_html/data.']);
    }
    if (!@rename($tmp, $dbFile)) {
        @unlink($tmp);
        bsb_json_response(500, ['error' => 'Unable to persist database file.']);
    }
}

function bsb_load_db(string $dataDir, string $dbFile): array {
    if (file_exists($dbFile)) {
        $raw = @file_get_contents($dbFile);
        if ($raw !== false) {
            $parsed = json_decode($raw, true);
            if (
                is_array($parsed) &&
                isset($parsed['adminPasswordHash'], $parsed['sessionSecret'], $parsed['flowers'], $parsed['storeSettings']) &&
                is_string($parsed['adminPasswordHash']) &&
                is_string($parsed['sessionSecret']) &&
                is_array($parsed['flowers']) &&
                is_array($parsed['storeSettings'])
            ) {
                $parsed['passwordVersion'] = isset($parsed['passwordVersion']) ? (int)$parsed['passwordVersion'] : 1;
                $parsed['flowers'] = bsb_sort_flowers($parsed['flowers']);
                return $parsed;
            }
        }
    }

    $fresh = [
        'adminPasswordHash' => password_hash(BSB_DEFAULT_PASSWORD, PASSWORD_DEFAULT),
        'passwordVersion' => 1,
        'sessionSecret' => bin2hex(random_bytes(32)),
        'flowers' => bsb_seed_flowers(),
        'storeSettings' => bsb_default_store_settings(),
    ];
    bsb_save_db($dataDir, $dbFile, $fresh);
    return $fresh;
}

function bsb_public_catalog(array $db): array {
    return [
        'flowers' => bsb_sort_flowers($db['flowers']),
        'storeSettings' => $db['storeSettings'],
        'realtime' => 'poll',
    ];
}

function bsb_is_https(): bool {
    if (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string)$_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') {
        return true;
    }
    return isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443;
}

function bsb_issue_token(array $db): string {
    $now = time();
    $payload = [
        'role' => 'admin',
        'ver' => (int)$db['passwordVersion'],
        'iat' => $now,
        'exp' => $now + BSB_SESSION_TTL,
    ];
    $encoded = bsb_base64url_encode((string)json_encode($payload));
    $sig = bsb_base64url_encode(hash_hmac('sha256', $encoded, (string)$db['sessionSecret'], true));
    return $encoded . '.' . $sig;
}

function bsb_extract_token(): ?string {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($authHeader === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (is_array($headers)) {
            foreach ($headers as $k => $v) {
                if (strtolower((string)$k) === 'authorization') {
                    $authHeader = (string)$v;
                    break;
                }
            }
        }
    }
    if (is_string($authHeader) && stripos($authHeader, 'Bearer ') === 0) {
        return trim(substr($authHeader, 7));
    }
    if (isset($_COOKIE[BSB_SESSION_COOKIE]) && is_string($_COOKIE[BSB_SESSION_COOKIE])) {
        return $_COOKIE[BSB_SESSION_COOKIE];
    }
    return null;
}

function bsb_verify_token(?string $token, array $db): bool {
    if (!$token || strpos($token, '.') === false) {
        return false;
    }
    [$encoded, $sig] = explode('.', $token, 2);
    if ($encoded === '' || $sig === '') {
        return false;
    }
    $expectedSig = bsb_base64url_encode(hash_hmac('sha256', $encoded, (string)$db['sessionSecret'], true));
    if (!hash_equals($expectedSig, $sig)) {
        return false;
    }
    $payload = json_decode(bsb_base64url_decode($encoded), true);
    if (!is_array($payload)) {
        return false;
    }
    return ($payload['role'] ?? '') === 'admin'
        && (int)($payload['ver'] ?? -1) === (int)$db['passwordVersion']
        && isset($payload['exp'])
        && (int)$payload['exp'] > time();
}

function bsb_set_cookie(string $token): void {
    $secure = bsb_is_https();
    setcookie(BSB_SESSION_COOKIE, $token, [
        'expires' => time() + BSB_SESSION_TTL,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => $secure ? 'None' : 'Lax',
    ]);
}

function bsb_clear_cookie(): void {
    $secure = bsb_is_https();
    setcookie(BSB_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => $secure ? 'None' : 'Lax',
    ]);
}

function bsb_read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : [];
}

function bsb_require_admin(array $db): void {
    if (!bsb_verify_token(bsb_extract_token(), $db)) {
        bsb_json_response(401, ['error' => 'Admin authentication required.']);
    }
}

function bsb_slugify_id(string $name, ?string $existingId = null): string {
    if ($existingId !== null && preg_match('/^[a-zA-Z0-9_-]{1,128}$/', $existingId) === 1) {
        return $existingId;
    }
    $base = strtolower(trim((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $name), '-'));
    $base = substr($base, 0, 48);
    $suffix = substr(bin2hex(random_bytes(4)), 0, 6);
    return ($base !== '' ? $base : 'flower') . '-' . $suffix;
}

function bsb_substr(string $value, int $max): string {
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max);
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$requestUri = (string)($_SERVER['REQUEST_URI'] ?? '/');
$path = (string)(parse_url($requestUri, PHP_URL_PATH) ?: '/');
$apiPath = (string)preg_replace('#^.*/api(?=/|$)#', '/api', $path);
$apiPath = rtrim($apiPath, '/');
if ($apiPath === '') {
    $apiPath = '/api';
}

$db = bsb_load_db($dataDir, $dbFile);

// GET /api/catalog
if ($method === 'GET' && $apiPath === '/api/catalog') {
    bsb_json_response(200, bsb_public_catalog($db));
}

// GET /api/admin/session
if ($method === 'GET' && $apiPath === '/api/admin/session') {
    bsb_json_response(200, [
        'authenticated' => bsb_verify_token(bsb_extract_token(), $db),
    ]);
}

// POST /api/admin/login
if ($method === 'POST' && $apiPath === '/api/admin/login') {
    $body = bsb_read_json_body();
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    if ($password === '' || !password_verify($password, (string)$db['adminPasswordHash'])) {
        bsb_json_response(401, ['error' => 'Incorrect merchant password.']);
    }
    $token = bsb_issue_token($db);
    bsb_set_cookie($token);
    bsb_json_response(200, ['authenticated' => true, 'token' => $token]);
}

// POST /api/admin/logout
if ($method === 'POST' && $apiPath === '/api/admin/logout') {
    bsb_clear_cookie();
    bsb_json_response(200, ['authenticated' => false]);
}

// POST /api/admin/change-password
if ($method === 'POST' && $apiPath === '/api/admin/change-password') {
    bsb_require_admin($db);
    $body = bsb_read_json_body();
    $current = isset($body['currentPassword']) && is_string($body['currentPassword']) ? $body['currentPassword'] : '';
    $next = isset($body['newPassword']) && is_string($body['newPassword']) ? $body['newPassword'] : '';

    if (!password_verify($current, (string)$db['adminPasswordHash'])) {
        bsb_json_response(400, ['error' => 'Current password is incorrect.']);
    }
    if (strlen($next) < 6 || strlen($next) > 128) {
        bsb_json_response(400, ['error' => 'New password must be between 6 and 128 characters.']);
    }
    if ($next === $current) {
        bsb_json_response(400, ['error' => 'New password must differ from current password.']);
    }

    $db['adminPasswordHash'] = password_hash($next, PASSWORD_DEFAULT);
    $db['passwordVersion'] = (int)$db['passwordVersion'] + 1;
    bsb_save_db($dataDir, $dbFile, $db);

    $token = bsb_issue_token($db);
    bsb_set_cookie($token);
    bsb_json_response(200, ['ok' => true, 'token' => $token]);
}

// POST /api/admin/flowers (create or update variety)
if ($method === 'POST' && $apiPath === '/api/admin/flowers') {
    bsb_require_admin($db);
    $body = bsb_read_json_body();
    $nameEn = bsb_substr(trim((string)($body['nameEn'] ?? '')), 100);
    if ($nameEn === '') {
        bsb_json_response(400, ['error' => 'Variety name is required.']);
    }

    $photosRaw = isset($body['photos']) && is_array($body['photos']) ? $body['photos'] : [];
    $photos = [];
    foreach ($photosRaw as $photo) {
        if (is_string($photo) && trim($photo) !== '') {
            $photos[] = $photo;
        }
        if (count($photos) >= 5) {
            break;
        }
    }
    if (count($photos) === 0) {
        bsb_json_response(400, ['error' => 'At least one photo is required.']);
    }

    $availability = in_array($body['availability'] ?? 'in_stock', ['in_stock', 'limited', 'out_of_stock'], true)
        ? (string)$body['availability']
        : 'in_stock';
    $now = bsb_now_iso();
    $draftId = isset($body['id']) && is_string($body['id']) ? $body['id'] : null;

    $existingIdx = -1;
    if ($draftId !== null) {
        foreach ($db['flowers'] as $idx => $item) {
            if (($item['id'] ?? '') === $draftId) {
                $existingIdx = $idx;
                break;
            }
        }
    }

    if ($existingIdx >= 0) {
        $existing = $db['flowers'][$existingIdx];
        $orderIndex = isset($body['orderIndex']) && is_numeric($body['orderIndex'])
            ? max(0, min(10000, (int)round((float)$body['orderIndex'])))
            : (int)($existing['orderIndex'] ?? $existingIdx);
        $updated = [
            'id' => (string)$existing['id'],
            'orderIndex' => $orderIndex,
            'nameEn' => $nameEn,
            'color' => bsb_substr(trim((string)($body['color'] ?? '')), 60),
            'cropEn' => bsb_substr(trim((string)($body['cropEn'] ?? 'Gerbera')), 60),
            'typeEn' => bsb_substr(trim((string)($body['typeEn'] ?? 'Standard')), 60),
            'breederCode' => bsb_substr(trim((string)($body['breederCode'] ?? '')), 60),
            'stemLength' => bsb_substr(trim((string)($body['stemLength'] ?? '')), 60),
            'extraSpecEn' => bsb_substr(trim((string)($body['extraSpecEn'] ?? '')), 240),
            'availability' => $availability,
            'photos' => $photos,
            'createdAt' => (string)($existing['createdAt'] ?? $now),
            'updatedAt' => $now,
        ];
        $db['flowers'][$existingIdx] = $updated;
        $db['flowers'] = bsb_sort_flowers($db['flowers']);
        bsb_save_db($dataDir, $dbFile, $db);
        bsb_json_response(200, ['flower' => $updated, 'catalog' => bsb_public_catalog($db)]);
    }

    $id = bsb_slugify_id($nameEn, $draftId);
    $orderIndex = isset($body['orderIndex']) && is_numeric($body['orderIndex'])
        ? max(0, min(10000, (int)round((float)$body['orderIndex'])))
        : count($db['flowers']);
    $created = [
        'id' => $id,
        'orderIndex' => $orderIndex,
        'nameEn' => $nameEn,
        'color' => bsb_substr(trim((string)($body['color'] ?? '')), 60),
        'cropEn' => bsb_substr(trim((string)($body['cropEn'] ?? 'Gerbera')), 60),
        'typeEn' => bsb_substr(trim((string)($body['typeEn'] ?? 'Standard')), 60),
        'breederCode' => bsb_substr(trim((string)($body['breederCode'] ?? '')), 60),
        'stemLength' => bsb_substr(trim((string)($body['stemLength'] ?? '')), 60),
        'extraSpecEn' => bsb_substr(trim((string)($body['extraSpecEn'] ?? '')), 240),
        'availability' => $availability,
        'photos' => $photos,
        'createdAt' => $now,
        'updatedAt' => $now,
    ];
    $db['flowers'][] = $created;
    $sorted = bsb_sort_flowers($db['flowers']);
    foreach ($sorted as $idx => &$item) {
        $item['orderIndex'] = $idx;
    }
    unset($item);
    $db['flowers'] = $sorted;
    bsb_save_db($dataDir, $dbFile, $db);
    bsb_json_response(200, ['flower' => $created, 'catalog' => bsb_public_catalog($db)]);
}

// POST /api/admin/flowers/reorder
if ($method === 'POST' && $apiPath === '/api/admin/flowers/reorder') {
    bsb_require_admin($db);
    $body = bsb_read_json_body();
    $index = isset($body['index']) ? (int)$body['index'] : -1;
    $direction = ($body['direction'] ?? 'down') === 'up' ? 'up' : 'down';
    $ordered = bsb_sort_flowers($db['flowers']);
    $targetIndex = $direction === 'up' ? $index - 1 : $index + 1;

    if ($index < 0 || $index >= count($ordered) || $targetIndex < 0 || $targetIndex >= count($ordered)) {
        bsb_json_response(400, ['error' => 'Cannot reorder variety in that direction.']);
    }

    $moved = array_splice($ordered, $index, 1);
    array_splice($ordered, $targetIndex, 0, $moved);
    $now = bsb_now_iso();
    foreach ($ordered as $idx => &$item) {
        $item['orderIndex'] = $idx;
        $item['updatedAt'] = $now;
    }
    unset($item);
    $db['flowers'] = $ordered;
    bsb_save_db($dataDir, $dbFile, $db);
    bsb_json_response(200, ['flowers' => $ordered, 'catalog' => bsb_public_catalog($db)]);
}

// POST /api/admin/flowers/seed
if ($method === 'POST' && $apiPath === '/api/admin/flowers/seed') {
    bsb_require_admin($db);
    $db['flowers'] = bsb_seed_flowers();
    bsb_save_db($dataDir, $dbFile, $db);
    bsb_json_response(200, ['flowers' => $db['flowers'], 'catalog' => bsb_public_catalog($db)]);
}

// DELETE /api/admin/flowers/{id} OR POST /api/admin/flowers/{id}/delete
if (
    ($method === 'DELETE' && preg_match('#^/api/admin/flowers/([^/]+)$#', $apiPath, $matches) === 1) ||
    ($method === 'POST' && preg_match('#^/api/admin/flowers/([^/]+)/delete$#', $apiPath, $matches) === 1)
) {
    bsb_require_admin($db);
    $flowerId = rawurldecode($matches[1]);
    $beforeCount = count($db['flowers']);
    $remaining = array_values(array_filter(
        $db['flowers'],
        static fn(array $item): bool => (string)($item['id'] ?? '') !== $flowerId
    ));
    if (count($remaining) === $beforeCount) {
        bsb_json_response(404, ['error' => 'Variety not found.']);
    }
    $sorted = bsb_sort_flowers($remaining);
    foreach ($sorted as $idx => &$item) {
        $item['orderIndex'] = $idx;
    }
    unset($item);
    $db['flowers'] = $sorted;
    bsb_save_db($dataDir, $dbFile, $db);
    bsb_json_response(200, ['ok' => true, 'catalog' => bsb_public_catalog($db)]);
}

// PUT or POST /api/admin/settings
if (($method === 'PUT' || $method === 'POST') && $apiPath === '/api/admin/settings') {
    bsb_require_admin($db);
    $body = bsb_read_json_body();
    $shopNameEn = bsb_substr(trim((string)($body['shopNameEn'] ?? '')), 80);
    $phone = bsb_substr(trim((string)($body['phone'] ?? '')), 20);
    $whatsapp = bsb_substr((string)preg_replace('/\D+/', '', (string)($body['whatsapp'] ?? '')), 18);

    if ($shopNameEn === '') {
        bsb_json_response(400, ['error' => 'Brand name is required.']);
    }
    if (preg_match('/^\+?[0-9\- ]{6,20}$/', $phone) !== 1) {
        bsb_json_response(400, ['error' => 'Invalid phone number.']);
    }
    if (preg_match('/^[0-9]{8,18}$/', $whatsapp) !== 1) {
        bsb_json_response(400, ['error' => 'Invalid WhatsApp number.']);
    }

    $updated = [
        'shopNameEn' => $shopNameEn,
        'phone' => $phone,
        'whatsapp' => $whatsapp,
        'locationEn' => bsb_substr(trim((string)($body['locationEn'] ?? '')), 120),
        'hoursEn' => bsb_substr(trim((string)($body['hoursEn'] ?? '')), 80),
        'updatedAt' => bsb_now_iso(),
    ];
    $db['storeSettings'] = $updated;
    bsb_save_db($dataDir, $dbFile, $db);
    bsb_json_response(200, ['storeSettings' => $updated, 'catalog' => bsb_public_catalog($db)]);
}

bsb_json_response(404, ['error' => 'API endpoint not found.']);
