# Security Scanner Backend

A Node.js Express API server for the Security Scanner Dashboard.

## Features

- Code vulnerability scanning
- Dependency analysis
- Dashboard statistics
- File upload support

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/scan/code` - Scan code for vulnerabilities (uses ESLint + eslint-plugin-security)
- `POST /api/scan/dependencies` - Scan dependencies (accepts package.json text, JSON file, or ZIP archive containing package.json)
- `POST /api/scan/repo` - Scan entire repository (ZIP) for code and dependency vulnerabilities
- `GET /api/dashboard/stats` - Get dashboard statistics

## Technologies Used

- Express.js
- Multer (file uploads)
- CORS