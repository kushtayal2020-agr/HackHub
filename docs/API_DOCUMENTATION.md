# HackHub REST API Specification
**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api`  
**Authentication:** Bearer Token (JWT in `Authorization: Bearer <token>`)

---

## 1. Authentication & User Profile

### `POST /auth/register`
Register a new participant, organiser, or judge account.
- **Access:** Public
- **Body (JSON):**
  ```json
  {
    "name": "Alice Walker",
    "email": "alice@university.edu",
    "password": "Password@123",
    "role": "participant",
    "college": "Apex Institute of Technology"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": { "id": 1, "name": "Alice Walker", "email": "alice@university.edu", "role": "participant" }
  }
  ```

### `POST /auth/login`
Authenticate existing user and issue JSON Web Token.
- **Access:** Public
- **Body (JSON):**
  ```json
  {
    "email": "alice@university.edu",
    "password": "Password@123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": { "id": 1, "name": "Alice Walker", "email": "alice@university.edu", "role": "participant" }
  }
  ```

### `GET /profile/me`
Retrieve currently authenticated user profile.
- **Access:** Authenticated (Any role)
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": 1,
      "name": "Alice Walker",
      "email": "alice@university.edu",
      "role": "participant",
      "college": "Apex Institute of Technology",
      "skills": "React, Node.js, Python, UI/UX",
      "github_url": "https://github.com/alicewalker",
      "avatar_path": "uploads/avatars/avatar-1-1700000000.png",
      "created_at": "2026-11-20T10:00:00.000Z"
    }
  }
  ```

### `PUT /profile/me`
Update profile fields (name, college, skills, github_url).
- **Access:** Authenticated

### `PUT /profile/password`
Update user password with current password verification.
- **Access:** Authenticated
- **Body (JSON):**
  ```json
  {
    "currentPassword": "OldPassword@123",
    "newPassword": "NewPassword@123"
  }
  ```

### `POST /profile/avatar`
Upload user profile avatar image (`multipart/form-data`, file field: `avatar`, max 2MB).
- **Access:** Authenticated

---

## 2. Administration & Governance (`/admin`)

### `GET /admin/stats`
Platform aggregated metrics and analytics.
- **Access:** Admin only
- **Response `200 OK`:** Returns total users, role breakdown, hackathons by status, and submissions count.

### `GET /admin/users`
Paginated search and filter list of registered users.
- **Access:** Admin only
- **Query Params:** `role`, `search`, `limit`, `offset`

### `PATCH /admin/users/:id/role`
Promote or change user role.
- **Access:** Admin only
- **Body:** `{ "role": "organiser" }`

### `GET /admin/hackathons`
List hackathons pending administrative review and approval.
- **Access:** Admin only

### `PATCH /admin/hackathons/:id/approval`
Approve or reject hackathon listing.
- **Access:** Admin only
- **Body:** `{ "approval_status": "approved", "rejection_reason": "" }`

### `GET /admin/audit-logs`
Retrieve tamper-evident audit logs with IP addresses and actions.
- **Access:** Admin only

---

## 3. Hackathons (`/hackathons`)

### `GET /hackathons`
List all approved hackathons with status filters (`upcoming`, `live`, `completed`).
- **Access:** Public

### `GET /hackathons/:id`
Detailed overview of a single hackathon, including timeline, rules, tracks, and registration window.
- **Access:** Public

### `POST /hackathons`
Create a new hackathon.
- **Access:** Organiser / Admin
- **Body:** `{ "title", "description", "start_date", "end_date", "registration_start", "registration_end", "max_team_size" }`

### `PUT /hackathons/:id`
Update hackathon details.
- **Access:** Organiser (Owner) / Admin

### `GET /hackathons/my/organized`
List hackathons created by the logged-in organiser.
- **Access:** Organiser / Admin

### `POST /hackathons/:id/publish-results`
Officially publish hackathon leaderboard results and unlock participant certificates.
- **Access:** Organiser (Owner) / Admin

---

## 4. Teams & Check-in (`/teams`, `/hackathons/:id/checkin`)

### `POST /hackathons/:id/teams`
Form a new team for a hackathon. Generates 6-character unique invite code.
- **Access:** Participant

### `POST /teams/join`
Join an existing team using a 6-character invite code.
- **Access:** Participant
- **Body:** `{ "invite_code": "A9B2F1" }`

### `GET /hackathons/:id/my-team`
Get current user's team details, roster, and submission for a hackathon.
- **Access:** Participant

### `GET /teams/mine`
List all teams across hackathons the user belongs to.
- **Access:** Participant

### `DELETE /teams/:teamId/members/:userId`
Remove a member from team (Team Leader only) or leave team.
- **Access:** Participant

### `POST /hackathons/:id/checkin`
Process attendee check-in using unique checkin code or user ID.
- **Access:** Organiser (Owner) / Admin
- **Body:** `{ "code": "chk_8f1b..." }`

### `GET /hackathons/:id/checkin/attendees`
Retrieve attendee roster and attendance status.
- **Access:** Organiser (Owner) / Admin

---

## 5. Submissions (`/submissions`)

### `POST /hackathons/:id/submissions`
Submit team project with metadata and deliverable file (`multipart/form-data`, file field: `file`, max 25MB ZIP/PDF).
- **Access:** Participant (Team Leader or Member)

### `PUT /submissions/:id`
Edit submitted project details or upload updated deliverables before deadline.
- **Access:** Participant (Team Leader or Member)

### `GET /submissions/:id`
Retrieve single submission details.
- **Access:** Authenticated (Team Members, Assigned Judges, Organiser, Admin)

### `GET /submissions/mine`
List all submissions across hackathons submitted by user's teams.
- **Access:** Participant

### `GET /hackathons/:id/submissions`
List all team submissions for a hackathon.
- **Access:** Organiser / Admin

### `DELETE /submissions/:id/withdraw`
Withdraw a project submission before deadline.
- **Access:** Participant (Team Leader)

---

## 6. Judging & Evaluation (`/hackathons/:id/judging`)

### `GET /hackathons/:id/criteria`
Retrieve evaluation criteria and normalized rubric weights.
- **Access:** Authenticated

### `POST /hackathons/:id/criteria`
Configure evaluation rubric criteria (Weights must sum to 100%).
- **Access:** Organiser / Admin
- **Body:**
  ```json
  {
    "criteria": [
      { "name": "Technical Complexity", "max_score": 10, "weight": 40 },
      { "name": "Innovation & Impact", "max_score": 10, "weight": 30 },
      { "name": "UI/UX & Design", "max_score": 10, "weight": 20 },
      { "name": "Presentation & Pitch", "max_score": 10, "weight": 10 }
    ]
  }
  ```

### `POST /hackathons/:id/judges/assign`
Assign a registered judge to a hackathon panel.
- **Access:** Organiser / Admin

### `GET /judging/assigned`
List hackathons assigned to the logged-in judge.
- **Access:** Judge

### `GET /hackathons/:id/judging/queue`
Retrieve submission evaluation queue for a judge.
- **Access:** Judge

### `POST /submissions/:id/score`
Submit numerical rubric ratings (0–10) and feedback for a submission.
- **Access:** Judge
- **Body:**
  ```json
  {
    "scores": [
      { "criterion_id": 1, "score": 9 },
      { "criterion_id": 2, "score": 8.5 }
    ],
    "comment": "Exceptional architecture and smooth execution."
  }
  ```

### `GET /hackathons/:id/leaderboard`
Retrieve ranked leaderboard calculated using weighted judge rubrics.
- **Access:** Public (Visible to all once published; visible to organiser/admin during evaluation)

---

## 7. Certificates & Verification (`/certificates`)

### `GET /hackathons/:id/certificates/info`
Check user's certificate eligibility and retrieve credential metadata.
- **Access:** Participant

### `GET /hackathons/:id/certificates/my-certificate`
Stream and download official vector PDF certificate.
- **Access:** Participant
- **Response `200 OK`:** `Content-Type: application/pdf`

### `GET /certificates/verify/:certId`
Public credential validation endpoint (used by QR scanner and LinkedIn verification).
- **Access:** Public (No authentication required)
- **Response `200 OK`:**
  ```json
  {
    "valid": true,
    "certificateId": "CERT-HK1-U7-6813B5C7",
    "recipientName": "Alice Walker",
    "college": "Apex Tech University",
    "teamName": "Team Apex",
    "hackathonTitle": "HackHub National Innovation Challenge 2026",
    "recognition": "1st Place Winner",
    "rank": 1,
    "verifiedAt": "2026-11-23T00:13:00.000Z"
  }
  ```

---

## 8. Notifications & Announcements (`/notifications`, `/hackathons/:id/announcements`)

### `GET /notifications`
Fetch unread count and latest in-app notifications for authenticated user.
- **Access:** Authenticated

### `PATCH /notifications/:id/read`
Mark single notification as read.
- **Access:** Authenticated

### `PATCH /notifications/read-all`
Mark all notifications as read.
- **Access:** Authenticated

### `GET /hackathons/:id/announcements`
List public announcements for a hackathon.
- **Access:** Public

### `POST /hackathons/:id/announcements`
Publish announcement and broadcast via Socket.io.
- **Access:** Organiser / Admin
