# Deploying BSBlooms to Hostinger

BSBlooms is pre-configured to work on **both** Hostinger Shared Web Hosting (`public_html` with built-in PHP) and Hostinger Node.js Web App Hosting.

---

## Option 1: Hostinger Web Hosting (`public_html` — Recommended & Easiest)

Works on **Single, Premium, Business, and Cloud Web Hosting** plans with zero database setup.

1. **Build the production bundle**:
   ```bash
   npm install
   npm run build
   ```
   This generates a clean `dist/` folder containing:
   - `index.html` and compiled `assets/` (JS, CSS, flower photos, BS logo, greenhouse photo)
   - `.htaccess` (routes `/api/*` to `api.php`, handles SPA routing, and blocks direct access to `data/`)
   - `api.php` (PHP 7.4+/8.x backend for admin login, password change, and live catalog storage)

2. **Upload to Hostinger**:
   - Open **Hostinger hPanel → Websites → Manage → File Manager**.
   - Open the **`public_html/`** folder (delete the default Hostinger `default.php` if present).
   - Upload **all files and folders inside `dist/`** directly into `public_html/` (make sure `.htaccess` is included — enable "Show hidden files" if uploading via FTP).

3. **Verify & Sign in to Admin**:
   - Visit your domain (e.g., `https://bsblooms.com`).
   - Scroll to the final screen and click **Merchant Admin** (or open `https://bsblooms.com/#admin`).
   - Sign in with the default password **`admin123`**.
   - Open **Password & Security** to set your own private merchant password, and open **Contact Settings** to update your live Phone and WhatsApp numbers.
   - All changes are stored automatically in `public_html/data/bsblooms-db.json` (protected from direct browser access by `.htaccess`).

---

## Option 2: Hostinger Node.js Hosting (Business / Cloud / VPS)

If deploying via Hostinger's Node.js Web App panel or Git integration:

- **Install command**: `npm install`
- **Build command**: `npm run build`
- **Start command**: `npm start` (runs `node server.ts` on `process.env.PORT`)
- **Environment variables**: `NODE_ENV=production` (and optional `ADMIN_DEFAULT_PASSWORD` for first-run default password)
