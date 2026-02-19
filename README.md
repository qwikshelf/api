# QwikShelf - Inventory & POS Management

A full-stack inventory management system with a Point of Sale (POS) interface.

## 🚀 Quick Start (Docker)

The easiest way to run the entire stack (API, UI, Database, and Proxy) is using Docker Compose.

1. **Environment Setup**:
   Ensure you have a `.env` file in the root `/api` folder (copy from `.env.example`).

2. **Start the Stack**:
   ```bash
   make up
   ```

3. **Access the Apps**:
   - **Frontend (UI)**: `http://localhost`
   - **API Docs (Swagger)**: `http://localhost:8080/swagger/index.html` (or via proxy)
   - **Database UI (Adminer)**: `http://localhost:81` (Login to Nginx Proxy Manager first)

---

## 🛠️ Local Development (Manual)

For faster iteration when writing code, you can run the services manually.

### 1. Database
You can start just the database using Docker:
```bash
cd deploy
docker-compose up -d db
```

### 2. Backend (Go API)
1. Install dependencies: `go mod download`
2. Run the server:
```bash
go run cmd/server/main.go
```
The API will be available at `http://localhost:8080`.

### 3. Frontend (React UI)
1. Navigate to UI folder: `cd ui`
2. Install dependencies: `npm install`
3. Run dev server:
```bash
npm run dev
```
The UI will be available at `http://localhost:5173`.

---

## 🏗️ Folder Structure
- `/internal`: Go backend source code.
- `/ui`: React + Vite + Tailwind frontend.
- `/deploy`: Docker, Nginx, and CloudFormation files.
- `/migrations`: Database schema files.
