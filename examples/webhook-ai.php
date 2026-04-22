<?php

header('Content-Type: application/json');

define('OPENAI_API_KEY', 'sk-xxxx-your-key-here');
define('SYSTEM_PROMPT', 'Kamu adalah asisten customer service yang ramah dan profesional. Jawab pertanyaan pelanggan dengan singkat dan jelas dalam Bahasa Indonesia.');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || empty($data['message'])) {
    echo json_encode([]);
    exit;
}

$reply = askGpt($data['message'], $data['push_name'] ?? '');

echo json_encode(['reply' => $reply]);

// ---------------------------------------------------------------------------

function askGpt(string $userMessage, string $name): string
{
    $payload = [
        'model'    => 'gpt-4o-mini',
        'messages' => [
            ['role' => 'system',  'content' => SYSTEM_PROMPT],
            ['role' => 'user',    'content' => "Nama pelanggan: $name\nPesan: $userMessage"],
        ],
        'max_tokens'  => 200,
        'temperature' => 0.7,
    ];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . OPENAI_API_KEY,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        return 'Mohon maaf, sistem kami sedang sibuk. Silakan coba beberapa saat lagi.';
    }

    $result = json_decode($response, true);
    return trim($result['choices'][0]['message']['content'] ?? '');
}
