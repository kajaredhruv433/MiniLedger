# MiniLedger

MiniLedger is a React Native app and Node.js/TypeScript API for tracking money lent and borrowed. It supports phone-number login with a five-minute development-only mock OTP, loan and repayment tracking, overdue balances, and optional receipt photos.

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL 14 or newer
- Expo Go on a phone, or an Android/iOS simulator
- Git, if you plan to push the project to GitHub

## Run locally

Run the API and mobile app in separate terminals from the project directory.

### 1. Create the PostgreSQL database

Start PostgreSQL, then create a database named `miniledger` using `psql` or a database GUI:

```sql
CREATE DATABASE miniledger;
```

The API creates or updates its tables and index when it starts. See [`database/schema.sql`](database/schema.sql) for the schema.

### 2. Configure and start the backend

In PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set values for your PostgreSQL server and a private JWT signing key:

```dotenv
PORT=4000
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/miniledger
JWT_SECRET=replace-with-a-long-random-secret
```

Replace the PostgreSQL username and password with your own. Generate a random key with Node.js if needed:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` private. It is ignored by Git; never commit it or share its contents. Install dependencies and launch the API:

```powershell
npm ci
npm run dev
```

The API listens on port `4000` and initializes the database on startup. Check `http://localhost:4000/health` for `{"status":"ok"}`. When requesting a login OTP, read the six-digit development OTP in this terminal and enter it in the app within five minutes. OTPs are held in memory and are cleared when the API restarts. This mock OTP flow does not send SMS and is not production authentication.

### 3. Configure and start the mobile app

The app's API address is currently set in [`mobile/src/services/api.ts`](mobile/src/services/api.ts) as `API_URL`. Change it before starting Expo:

- Physical phone: use the computer's Wi-Fi IPv4 address, for example `http://192.168.1.25:4000`. On Windows, find the address by running `ipconfig` and checking the Wi-Fi adapter's IPv4 address.
- Android emulator: use `http://10.0.2.2:4000`.
- iOS simulator: use `http://localhost:4000`.

For a physical phone, connect the phone and computer to the same Wi-Fi network and allow inbound connections to port `4000` through the computer's firewall. The backend listens on all network interfaces for local-device testing.

Open a second PowerShell terminal from the project directory:

```powershell
cd mobile
npm ci
npm start
```

Scan the Expo QR code with Expo Go, or select an available simulator from the Expo terminal. Restart Expo after changing `API_URL`.

### 4. Try the app

1. Enter a 10-digit phone number, such as `9876543210`.
2. Get the six-digit mock OTP from the backend terminal and enter it in the app.
3. Add a loan with a friend's name, amount in rupees, due date, and whether the money was lent or borrowed.
4. Check the dashboard for totals and overdue balances. Mark an entry as repaid or add an optional receipt photo.

## Tests and checks

From the project directory:

```powershell
cd backend
npm test
npm run build
```

In another terminal:

```powershell
cd mobile
npm run typecheck
```

The backend tests use Jest and Supertest. They cover loan creation, amount validation, repayment, summary calculation, OTP rejection, and phone validation.

## API

Loan endpoints require the JWT returned by `POST /api/auth/verify-otp` in an `Authorization: Bearer <token>` header.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health check |
| `POST` | `/api/auth/request-otp` | Request a mock OTP with `{ "phone": "9876543210" }` |
| `POST` | `/api/auth/verify-otp` | Verify with `{ "phone": "9876543210", "otp": "123456" }` and receive a JWT |
| `GET` | `/api/loans` | List the signed-in user's loans |
| `POST` | `/api/loans` | Add a loan (JSON or multipart form; optional receipt image) |
| `PATCH` | `/api/loans/:id/repaid` | Mark an outstanding loan as repaid |
| `DELETE` | `/api/loans/:id` | Delete a loan |
| `GET` | `/api/loans/summary` | Get lent, borrowed, outstanding, and overdue totals |

Receipt uploads accept JPEG, PNG, and WebP images up to 3 MB. The app compresses photos and saves them in the phone gallery; uploaded copies are stored in `backend/uploads/`. The app checks for gallery deletion when the runtime grants gallery read access. Some recent Android versions grant write access only; in that case the app displays the uploaded backend copy instead.

## Project structure

```text
MiniLedger/
├── backend/       Express API, authentication, loan routes, and PostgreSQL access
├── mobile/        Expo React Native app
├── database/      SQL schema reference
└── README.md
```

## Upload to GitHub

From the project root, initialize a local repository if needed, then stage and inspect the files:

```powershell
git init -b main
git add -A
git status --short
```

The root `.gitignore` excludes `.env`, `node_modules`, build output, Expo files, test caches, and `backend/uploads/`. Check the staged list before committing; it should contain source code, package lock files, configuration, the `.env.example` template, schema, and this README—not your `.env` or receipt images.

After creating an empty repository on GitHub, connect it and push the staged files:

```powershell
git commit -m "Prepare MiniLedger for GitHub"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your repository's URL. Do not put credentials, passwords, signing keys, or personal receipt photos in the repository.
