# WhatsApp Gateway Multi-Device (WAGW)

Project ini adalah WhatsApp Gateway API berbasis Node.js menggunakan library `@whiskeysockets/baileys`. Mendukung multi-device, pengiriman pesan massal (bulk blast) dengan rotasi pengirim acak, serta pencatatan log pesan menggunakan SQLite.

## Fitur Utama

*   **Multi-Device Support**: Bisa menghubungkan banyak nomor WhatsApp sekaligus.
*   **QR Code Authentication**: Login mudah via QR Code yang ditampilkan di web.
*   **Device Management**: Lihat daftar perangkat, status koneksi, dan hapus perangkat.
*   **Bulk Blast**: Kirim pesan massal ke banyak nomor sekaligus.
*   **Random Sender Rotation**: Otomatis merotasi pengirim secara acak dari device yang terhubung untuk menghindari deteksi spam.
*   **Random Message Variation**: Mendukung variasi pesan acak (spintax like) untuk setiap penerima.
*   **Message Logging**: Menyimpan riwayat pesan (sukses/gagal) ke database SQLite.
*   **Secure API Key**: Endpoint API dilindungi menggunakan API Key.
*   **Auto-Reply via Webhook**: Balas pesan masuk secara otomatis menggunakan server webhook eksternal.
*   **Web Interface**:
    *   Halaman Login/Scan QR & Manajemen Perangkat: `/`
    *   Halaman Log Pesan: `/logs-view`
    *   Halaman Dokumentasi: `/docs`

## Instalasi

### Cara Manual (Node.js)

1.  Pastikan Node.js sudah terinstal.
2.  Clone repository ini.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Buat file `.env` (opsional, jika tidak ada akan menggunakan default):
    ```env
    PORT=10000
    DEFAULT_API_KEY=wagw-secret-key
    ```
5.  Jalankan server:
    ```bash
    node app.js
    ```
6. Atau jika ingin berjalan di background (gunakan process manager seperti pm2):
    ```bash
    pm2 start app.js --name wagw
    ```

### Cara Menggunakan Docker

1.  Build image:
    ```bash
    docker build -t wagw .
    ```
2.  Jalankan container (mapping port 10000):
    ```bash
    docker run -d -p 10000:10000 --name wagw-container -v $(pwd)/sessions:/usr/src/app/sessions -v $(pwd)/.env:/usr/src/app/.env wagw
    ```
    *Note: Volume `-v` digunakan agar sesi login tidak hilang saat container di-restart dan konfigurasi .env terbaca.*

## Konfigurasi

Konfigurasi server dilakukan melalui file `.env`.

| Variable | Default | Deskripsi |
| :--- | :--- | :--- |
| `PORT` | `10000` | Port aplikasi berjalan |
| `DEFAULT_API_KEY` | `wagw-secret-key` | API Key default yang dibuat saat inisialisasi database |
| `AUTO_REPLY_WEBHOOK_URL` | *(kosong)* | URL webhook yang dipanggil WAGW setiap ada pesan masuk. Jika kosong, auto-reply dinonaktifkan. |
| `AUTO_REPLY_TIMEOUT_MS` | `10000` | Timeout (ms) menunggu respons dari webhook. |
| `AUTO_REPLY_FALLBACK_MESSAGE` | *(kosong)* | Pesan yang dikirim jika webhook gagal/timeout. Kosong = tidak ada balasan. |

## Keamanan API (API Key)

Semua endpoint API (`/wagateway/*`) dilindungi oleh API Key.
Anda harus menyertakan API Key di **Header** atau **Query Parameter** pada setiap request.

*   **Header**: `x-api-key: [API_KEY_ANDA]`
*   **Query Parameter**: `?api_key=[API_KEY_ANDA]`

**API Key Default**: Lihat konfigurasi `DEFAULT_API_KEY` di `.env` (default: `wagw-secret-key`)

> **PENTING**: API Key ini disimpan di database SQLite (`wagw.db`) dalam tabel `api_keys`. Anda disarankan untuk mengubahnya atau menambahkan key baru langsung melalui database.

## Cara Menggunakan

### 1. Manajemen Perangkat (Login, List, Logout, Delete)
Akses `http://localhost:10000/` (sesuaikan port) di browser.

*   **Tambah Perangkat**: Masukkan Device ID unik, klik "Generate QR Code", lalu scan.
*   **Lihat Daftar Perangkat**: Masukkan API Key di bagian "Registered Devices" lalu klik "Refresh List".
    *   Status: **CONNECTED** (Hijau) atau **DISCONNECTED** (Merah).
*   **Hapus Perangkat**: Klik tombol "Delete" pada tabel daftar perangkat. Ini akan logout dari WA dan menghapus data sesi di server.

### 2. Mengirim Pesan Tunggal
**Endpoint**: `POST /wagateway/kirimpesan`

**Header**:
```
x-api-key: wagw-secret-key
Content-Type: application/json
```

**Body (JSON)**:
```json
{
    "sender": "admin1",
    "number": "6281234567890",
    "message": "Halo, ini pesan test"
}
```

### 3. Mengirim Pesan Massal (Blast)
Fitur ini akan mengirim pesan ke banyak nomor dengan menggunakan **semua device yang terhubung secara acak**.
Mendukung pesan dinamis (personalisasi) berdasarkan data penerima.

**Endpoint**: `POST /wagateway/blast`

**Header**:
```
x-api-key: wagw-secret-key
Content-Type: application/json
```

**Body (JSON)**:
```json
{
  "receiver": [
    { "number": "6281234567890", "nama": "Fatimah", "tanggal": "2023-08-01", "poli": "Umum" },
    { "number": "6281234567891", "nama": "Joko", "tanggal": "2023-08-02", "poli": "Gigi" }
  ],
  "messages": [
    "Halo {nama}, jadwal {poli} Anda pada tanggal {tanggal} sudah dikonfirmasi.",
    "Hi {nama}, jangan lupa jadwal {poli} tanggal {tanggal} ya!"
  ],
  "type": "text"
}
```
*   `receiver`: Array objek penerima. Wajib ada key `number`. Key lain (seperti `nama`, `poli`, dll) bisa digunakan sebagai variabel di dalam pesan.
*   `messages`: Array variasi pesan. Sistem akan memilih satu secara acak. Gunakan `{key}` untuk menyisipkan data penerima.
*   `type`: `text`, `image`, atau `document`. Jika media, tambahkan properti `"url": "..."` di level utama JSON.

### 4. Melihat Log Pesan
Akses `http://localhost:10000/logs-view` untuk melihat riwayat pesan.
Anda akan diminta memasukkan **API Key** untuk melihat data log demi keamanan.

## Auto-Reply via Webhook

WAGW mendukung auto-reply otomatis untuk pesan **personal** (1-on-1) yang masuk. Setiap kali ada pesan masuk, WAGW akan melakukan POST ke URL webhook yang Anda tentukan, lalu mengirimkan teks balasan yang dikembalikan oleh webhook tersebut.

### Cara Kerja

```
Pesan masuk dari WA
        │
        ▼
WAGW POST payload → Webhook URL Anda
        │
        ▼
Webhook memproses & mengembalikan JSON {"reply": "..."}
        │
        ▼
WAGW mengirim balasan ke pengirim
```

### Konfigurasi `.env`

```env
AUTO_REPLY_WEBHOOK_URL=https://yourdomain.com/webhook.php
AUTO_REPLY_TIMEOUT_MS=10000
AUTO_REPLY_FALLBACK_MESSAGE=Maaf, sistem kami sedang gangguan. Mohon tunggu sebentar.
```

### Payload yang Dikirim WAGW ke Webhook

WAGW melakukan `POST` dengan `Content-Type: application/json`:

```json
{
  "device_id":  "admin1",
  "from":       "6281234567890@s.whatsapp.net",
  "to":         "6281234567890@s.whatsapp.net",
  "push_name":  "Nama Pengirim",
  "message":    "Halo",
  "timestamp":  1713700000
}
```

| Field | Tipe | Keterangan |
| :--- | :--- | :--- |
| `device_id` | string | ID device WAGW yang menerima pesan |
| `from` | string | JID (nomor) pengirim pesan |
| `to` | string | JID tujuan (nomor device Anda) |
| `push_name` | string | Nama tampilan pengirim di WhatsApp |
| `message` | string | Isi teks pesan yang diterima |
| `timestamp` | number | Unix timestamp pesan |

### Format Response Webhook

Webhook Anda harus mengembalikan JSON. WAGW membaca field berikut (diprioritaskan berurutan):

| Response | Perilaku WAGW |
| :--- | :--- |
| `{"reply": "teks balasan"}` | ✅ Mengirim balasan |
| `{"message": "teks balasan"}` | ✅ Mengirim balasan |
| `{"text": "teks balasan"}` | ✅ Mengirim balasan |
| `{}` / kosong / `null` | ⛔ Tidak ada balasan |

> **Catatan**: Auto-reply hanya aktif untuk chat **personal** (1-on-1). Pesan dari grup, broadcast, dan status diabaikan.

### Contoh Webhook PHP

File contoh tersedia di [`examples/webhook.php`](examples/webhook.php). Fitur yang ada:
- Balas berdasarkan **kata kunci** (halo, jam buka, harga, lokasi, dll.)
- Menampilkan **menu bantuan** jika pengguna mengetik "bantuan" atau "menu"
- Mengembalikan `{}` (tanpa balasan) jika tidak ada kata kunci yang cocok

Salin file tersebut ke server PHP Anda, lalu atur `AUTO_REPLY_WEBHOOK_URL` di `.env` WAGW:

```env
AUTO_REPLY_WEBHOOK_URL=https://yourdomain.com/webhook.php
```

### Mengelola Auto-Reply Per-Device (API)

Gunakan endpoint berikut untuk mengaktifkan/menonaktifkan auto-reply pada device tertentu tanpa restart server:

**Aktifkan auto-reply:**
```http
POST /wagateway/auto-reply/enable
x-api-key: wagw-secret-key
Content-Type: application/json

{"device_id": "admin1"}
```

**Nonaktifkan auto-reply:**
```http
POST /wagateway/auto-reply/disable
x-api-key: wagw-secret-key
Content-Type: application/json

{"device_id": "admin1"}
```

## Struktur Database (SQLite)
File database: `wagw.db`

### Tabel `message_logs`
- `id`: ID unik
- `sender`: ID Pengirim
- `recipient`: Nomor Tujuan
- `message`: Isi Pesan (JSON stringified)
- `status`: 'success' atau 'failed: [error message]'
- `timestamp`: Waktu pengiriman

### Tabel `api_keys`
- `id`: ID unik
- `key`: Kunci API
- `description`: Deskripsi pemilik kunci
- `created_at`: Waktu pembuatan
