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
*   **Web Interface**:
    *   Halaman Login/Scan QR & Manajemen Perangkat: `/`
    *   Halaman Log Pesan: `/logs-view`
    *   Halaman Dokumentasi: `/docs`

## Instalasi

1.  Pastikan Node.js sudah terinstal.
2.  Clone repository ini.
3.  Install dependencies:
    ```bash
    npm install
    ```

## Konfigurasi Port

Port server ditentukan dalam file `port.pl`. Defaultnya adalah `10000`. Ubah file tersebut jika ingin menggunakan port lain.

## Cara Menjalankan

Jalankan perintah berikut di terminal:

```bash
node app.js
```
Atau jika ingin berjalan di background (gunakan process manager seperti pm2):
```bash
pm2 start app.js --name wagw
```

## Keamanan API (API Key)

Semua endpoint API (`/wagateway/*`) dilindungi oleh API Key.
Anda harus menyertakan API Key di **Header** atau **Query Parameter** pada setiap request.

*   **Header**: `x-api-key: [API_KEY_ANDA]`
*   **Query Parameter**: `?api_key=[API_KEY_ANDA]`

**API Key Default**: `wagw-secret-key`

> **PENTING**: API Key ini disimpan di database SQLite (`wagw.db`) dalam tabel `api_keys`. Anda disarankan untuk mengubahnya atau menambahkan key baru langsung melalui database.

## Cara Menggunakan

### 1. Manajemen Perangkat (Login, List, Logout, Delete)
Akses `http://localhost:10000/` di browser.

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

**Endpoint**: `POST /wagateway/blast`

**Header**:
```
x-api-key: wagw-secret-key
Content-Type: application/json
```

**Body (JSON)**:
```json
{
    "numbers": [
        "6281234567890",
        "6289876543210",
        "08123456789"
    ],
    "messages": [
        "Halo, ini pesan variasi A",
        "Hi, apa kabar? ini variasi B",
        "Selamat siang, penawaran khusus C"
    ],
    "type": "text" 
}
```
*Catatan: `type` bisa diisi `text`, `image`, atau `document` (jika image/document, tambahkan parameter `url`).*

### 4. Melihat Log Pesan
Akses `http://localhost:10000/logs-view` untuk melihat riwayat pesan.
Anda akan diminta memasukkan **API Key** untuk melihat data log demi keamanan.

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
