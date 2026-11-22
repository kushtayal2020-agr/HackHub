# HackHub - Hackathon and Event Management Platform

HackHub is a Full-Stack Hackathon and Developer Event Management Platform. It enables hackathon organisers to host events, manage rubrics, and publish live results; participants can discover hackathons, form teams, check in via venue QR codes, submit projects, and download verifiable certificates; judges can score submissions based on weighted criteria.

## Tech Stack
- **Frontend**: Plain HTML5, CSS3 (Custom Responsive Design System with Light/Dark theme), and Vanilla JavaScript (ES6+). No frameworks or build tools.
- **Backend**: Node.js & Express.js REST API with modular controllers, input validation (`express-validator`), security middleware (`helmet`, rate limiting), JWT authentication, file uploads (`multer`), and real-time updates (`socket.io`).
- **Database**: MySQL 8.0 via `mysql2/promise` with parameterized queries, transactions, and foreign key constraints.

## Project Structure
```text
HackHub/
├── Backend/                 # Express REST API
│   ├── controllers/         # Business logic handlers (auth, admin, teams, submissions, judging, certs, etc.)
│   ├── database/            # MySQL connection pool
│   ├── middleware/          # Auth, role check, validation, upload, error handler
│   ├── routes/              # Express API route declarations
│   ├── scripts/             # Admin creation & demo seeding scripts
│   ├── uploads/             # Multer upload storage (banners, avatars, submissions)
│   ├── utils/               # PDFKit certificate generator, audit logger, notification helper
│   ├── server.js            # Express & Socket.io server entry point
│   ├── package.json
│   ├── .env.example
│   └── .env                 # Secret environment variables (never committed)
├── Frontend/                # Client web application (Vanilla HTML5 / Modern CSS / ES6+)
│   ├── css/                 # Design system & hackathon styles (Light & Dark theme)
│   ├── js/                  # Page controllers & shared utilities
│   ├── index.html           # Landing page
│   ├── login.html           # Authentication login
│   ├── register.html        # Registration (participant, organiser, judge)
│   ├── profile.html         # User profile, skills & security studio
│   ├── hackathons.html      # Public hackathon directory
│   ├── hackathon-detail.html# Hackathon overview & announcements
│   ├── create-hackathon.html# Organiser hackathon creator/editor
│   ├── my-hackathons.html   # Organiser hackathons list
│   ├── my-teams.html        # Participant teams & roster
│   ├── team.html            # Team management & invite code
│   ├── checkin.html         # Participant QR pass & Organiser attendance terminal
│   ├── submit.html          # Drag-and-drop project submission studio
│   ├── my-submissions.html  # Participant submissions tracker
│   ├── judge-dashboard.html # Assigned hackathons queue for judges
│   ├── judging.html         # Weighted rubric evaluation studio
│   ├── leaderboard.html     # Live Socket.io leaderboard & podium
│   ├── certificate.html     # Verifiable PDF certificate viewer & public validator
│   ├── 404.html             # Error page
│   └── config.js            # Frontend API URL configuration
├── docs/                    # Architecture diagrams, test cases, Postman collection & report
│   ├── PROJECT_REPORT.md    # Comprehensive project architecture and engineering report
│   ├── API_DOCUMENTATION.md # REST API endpoint specifications
│   ├── TEST_CASES.md        # Full verification & test matrix
│   ├── DEPLOYMENT_GUIDE.md  # Production PM2, Nginx & Docker deployment guide
│   └── postman/             # Postman Collection v2.1.0 (HackHub_Complete_API_Collection.json)
├── Dockerfile               # Production container image
├── docker-compose.yml       # 1-Click stack deployment (MySQL + Node API + Nginx)
├── schema.sql               # MySQL database schema (11 tables)
├── schema_deploy.sql        # Standalone production deployment & seed script
└── README.md
```

## Running the Project Locally

### Option 1: Quickstart via Docker Compose
```bash
docker-compose up -d --build
```
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`

### Option 2: Manual Local Setup

#### 1. Database Setup
Ensure MySQL Server 8.0+ is running. Create and initialize the database schema:
```bash
mysql -u root -p < schema_deploy.sql
```

#### 2. Backend Setup
Navigate to the `Backend` directory:
```bash
cd Backend
npm install
node server.js
```
Verify the API health check: `http://localhost:5000/api/health`

#### 3. Frontend Setup
Open `Frontend/index.html` using a static server (e.g. VS Code Live Server at `http://127.0.0.1:5500`). Ensure `Frontend/config.js` points to `http://localhost:5000`.

## Test Accounts (Seeded Demo Logins)
Password for all demo accounts: `Demo@1234`
| Role | Email | Features |
|---|---|---|
| Admin | `admin@hackhub.test` | System stats, user management, hackathon approvals, audit logs |
| Organiser | `organiser@hackhub.test` | Create hackathons, QR attendance terminal, configure rubrics, publish results |
| Judge | `judge@hackhub.test` | Assigned queues, 0-10 weighted sliders, evaluation feedback |
| Participant 1 | `participant@hackhub.test` | Team lead (Team Apex), QR pass, file submission, certificate |
| Participant 2 | `participant2@hackhub.test` | Team member, attendance check-in, certificate download |

## Documentation & Postman
- [Academic Project Report](file:///c:/Users/Lenovo/OneDrive/Desktop/HackHub/docs/PROJECT_REPORT.md)
- [REST API Documentation](file:///c:/Users/Lenovo/OneDrive/Desktop/HackHub/docs/API_DOCUMENTATION.md)
- [Test Verification Matrix](file:///c:/Users/Lenovo/OneDrive/Desktop/HackHub/docs/TEST_CASES.md)
- [Production Deployment Guide](file:///c:/Users/Lenovo/OneDrive/Desktop/HackHub/docs/DEPLOYMENT_GUIDE.md)
- [Postman Collection JSON](file:///c:/Users/Lenovo/OneDrive/Desktop/HackHub/docs/postman/HackHub_Complete_API_Collection.json)
