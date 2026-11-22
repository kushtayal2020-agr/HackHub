# HackHub - Hackathon and Event Management Platform

HackHub is a Full Stack PBL college project (Hackathon and Event Management Platform). It enables hackathon organisers to host events, manage rubrics, and publish live results; participants can discover hackathons, form teams, check in via venue QR codes, submit projects, and download verifiable certificates; judges can score submissions based on weighted criteria.

## Tech Stack
- **Frontend**: Plain HTML5, CSS3 (Custom Responsive Design System with Light/Dark theme), and Vanilla JavaScript (ES6+). No frameworks or build tools.
- **Backend**: Node.js & Express.js REST API with modular controllers, input validation (`express-validator`), security middleware (`helmet`, rate limiting), JWT authentication, file uploads (`multer`), and real-time updates (`socket.io`).
- **Database**: MySQL 8.0 via `mysql2/promise` with parameterized queries, transactions, and foreign key constraints.

## Project Structure
```text
HackHub/
├── Backend/                 # Express REST API
│   ├── controllers/         # Business logic handlers
│   ├── database/            # MySQL connection pool
│   ├── middleware/          # Auth, role check, validation, upload, error handler
│   ├── routes/              # Express API route declarations
│   ├── scripts/             # Admin creation & demo seeding scripts
│   ├── uploads/             # Multer upload storage (banners, avatars, submissions)
│   ├── utils/               # Mailer, audit logger, notification helper, leaderboard
│   ├── server.js            # Express & Socket.io server entry point
│   ├── package.json
│   ├── .env.example
│   └── .env                 # Secret environment variables (never committed)
├── Frontend/                # Client web application
│   ├── css/                 # Design system & hackathon styles
│   ├── js/                  # Page controllers & shared utilities
│   ├── index.html           # Landing page
│   ├── login.html           # Authentication login
│   ├── register.html        # Registration (participant, organiser, judge)
│   ├── hackathons.html      # Public hackathon directory
│   ├── hackathon-detail.html# Hackathon overview & announcements
│   ├── create-hackathon.html# Organiser hackathon creator/editor
│   ├── my-hackathons.html   # Organiser hackathons list
│   ├── 404.html             # Error page
│   └── config.js            # Frontend API URL configuration
├── docs/                    # Architecture diagrams, test cases, Postman collection & report
├── schema.sql               # MySQL database schema (11 tables)
├── schema_deploy.sql        # Safe schema for hosted MySQL deployment
└── README.md
```

## Running the Project Locally

### 1. Database Setup
Ensure MySQL Server 8.0+ is running. Create and initialize the database schema:
```bash
mysql -u root -p < schema.sql
```

### 2. Backend Setup
Navigate to the `Backend` directory:
```bash
cd Backend
```
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your MySQL credentials, `JWT_SECRET`, and optional email SMTP credentials.

Install backend dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```
Verify the API health check by visiting: `http://localhost:5000/api/health`

### 3. Frontend Setup
Open `Frontend/index.html` using a static file server or VS Code Live Server (`http://127.0.0.1:5500` or `http://localhost:3000`).

Check `Frontend/config.js` to ensure `API_URL` points to your backend instance:
```javascript
const API_URL = 'http://localhost:5000';
```

## Test Accounts (Seeded Demo Logins)
Password for all demo accounts: `Demo@1234`
| Role | Email |
|---|---|
| Admin | `admin@hackhub.test` |
| Organiser | `organiser@hackhub.test` |
| Judge | `judge@hackhub.test` |
| Participant 1 | `participant@hackhub.test` |
| Participant 2 | `participant2@hackhub.test` |

## Live Deployment Links
- **Frontend Application**: (to be added upon hosting)
- **Backend API**: (to be added upon hosting)
- **Database**: Hosted MySQL instance
