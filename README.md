# Rangnodi Backend

Express.js REST API with TypeScript for the Rangnodi platform.

## Features

- **Language**: TypeScript 5
- **Framework**: Express.js
- **Development Tooling**: `tsx` (fast TypeScript execution with hot-reload watch mode)
- **Security & Utilities**: `helmet`, `cors`, `morgan`, `dotenv`
- **Architecture**: Modular structure separating controllers, routes, middlewares, and configuration
- **Production Ready**: Full build setup compiling to clean JavaScript in `dist/`

## Project Structure

```text
rangnodi-backend/
├── src/
│   ├── config/             # Configuration & environment variables
│   │   └── environment.ts
│   ├── controllers/        # Route controllers / handlers
│   │   └── health.controller.ts
│   ├── middlewares/        # Custom middlewares (errorHandler, notFound, etc.)
│   │   ├── errorHandler.ts
│   │   └── notFoundHandler.ts
│   ├── routes/             # API routes
│   │   ├── api.route.ts
│   │   ├── health.route.ts
│   │   └── index.ts
│   ├── app.ts              # Express application configuration
│   └── server.ts           # Entry point & server lifecycle
├── .env                    # Local environment variables
├── .env.example            # Environment template
├── .gitignore              # Git ignore configuration
├── package.json            # Node.js dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── README.md
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` if not already present:
```bash
cp .env.example .env
```

### 3. Run in Development Mode
Starts the server with live reload on file changes:
```bash
npm run dev
```

### 4. Build for Production
Compiles TypeScript into the `dist/` directory:
```bash
npm run build
```

### 5. Start Production Server
```bash
npm start
```

### 6. Typecheck
Verifies TypeScript types without emitting files:
```bash
npm run typecheck
```

## Available Endpoints

- `GET /` - API health and index
- `GET /health` - Service health status & uptime
- `GET /api/v1` - Base API v1 endpoint
