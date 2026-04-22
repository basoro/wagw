<?php

/**
 * Contoh Webhook PHP untuk WAGW Auto-Reply
 * =========================================
 * File ini menerima payload pesan masuk dari WAGW dan mengembalikan
 * balasan otomatis berdasarkan kata kunci dalam pesan.
 *
 * Konfigurasi .env di server WAGW:
 *   AUTO_REPLY_WEBHOOK_URL=https://yourdomain.com/webhook.php
 *   AUTO_REPLY_TIMEOUT_MS=10000
 *   AUTO_REPLY_FALLBACK_MESSAGE=Maaf, sistem kami sedang gangguan. Mohon tunggu sebentar.
 *
 * Payload yang dikirim WAGW (POST, Content-Type: application/json):
 * {
 *   "device_id":  "admin1",
 *   "from":       "6281234567890@s.whatsapp.net",
 *   "to":         "6281234567890@s.whatsapp.net",
 *   "push_name":  "Nama Pengirim",
 *   "message":    "Halo",
 *   "timestamp":  1713700000
 * }
 *
 * Response yang diharapkan (JSON):
 *   {"reply": "teks balasan"}   → WAGW mengirim balasan ini
 *   {}                          → WAGW tidak mengirim balasan
 */

header('Content-Type: application/json');

// Hanya terima POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Baca dan parse body request
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$deviceId = $data['device_id'] ?? '';
$from     = $data['from']      ?? '';
$pushName = $data['push_name'] ?? 'Kak';
$message  = trim(strtolower($data['message'] ?? ''));

if ($message === '') {
    // Tidak ada teks → tidak perlu dibalas
    echo json_encode([]);
    exit;
}

$reply = getAutoReply($pushName, $message);

if ($reply === null) {
    // Tidak ada kata kunci yang cocok → WAGW tidak mengirim balasan
    echo json_encode([]);
    exit;
}

echo json_encode(['reply' => $reply]);

// ---------------------------------------------------------------------------

/**
 * Tentukan balasan berdasarkan kata kunci dalam pesan.
 * Kembalikan null jika tidak ada kata kunci yang cocok.
 */
function getAutoReply(string $name, string $message): ?string
{
    if (containsAny($message, ['halo', 'hai', 'hi', 'helo', 'hello'])) {
        return "Halo $name! 👋 Ada yang bisa kami bantu?";
    }

    if (containsAny($message, ['jam buka', 'buka jam', 'jam operasional', 'jam kerja'])) {
        return "Kami buka Senin–Sabtu pukul 08.00–17.00 WIB. 🕐";
    }

    if (containsAny($message, ['harga', 'price', 'tarif', 'biaya', 'cost'])) {
        return "Untuk informasi harga, silakan kunjungi website kami atau hubungi CS di jam kerja. 😊";
    }

    if (containsAny($message, ['lokasi', 'alamat', 'dimana', 'di mana', 'location', 'address'])) {
        return "Kantor kami beralamat di Jl. Contoh No. 123, Jakarta. 📍\nGoogle Maps: https://maps.app.goo.gl/contoh";
    }

    if (containsAny($message, ['terima kasih', 'makasih', 'thanks', 'thank you'])) {
        return "Sama-sama $name! Jangan sungkan untuk menghubungi kami kembali. 🙏";
    }

    if (containsAny($message, ['bantuan', 'help', 'menu', 'info'])) {
        return implode("\n", [
            "Halo $name! Berikut menu bantuan kami: 📋",
            "",
            "1️⃣  Ketik *jam buka* — Info jam operasional",
            "2️⃣  Ketik *harga*    — Info harga & tarif",
            "3️⃣  Ketik *lokasi*   — Alamat kantor",
            "",
            "Atau hubungi CS kami langsung untuk pertanyaan lainnya.",
        ]);
    }

    // Tidak ada kata kunci yang cocok
    return null;
}

/**
 * Cek apakah $haystack mengandung salah satu kata kunci dari $needles.
 */
function containsAny(string $haystack, array $needles): bool
{
    foreach ($needles as $needle) {
        if (str_contains($haystack, $needle)) {
            return true;
        }
    }
    return false;
}
