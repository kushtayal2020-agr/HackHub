# HackHub Test Plan & Verification Matrix
**Test Strategy:** Unit, Integration, Role Authorization, Security & Acceptance Testing  
**Coverage:** 100% Core Features across Phases A through I

---

## 1. Authentication & Security Test Suite

| Test ID | Test Scenario | Input Data | Expected Result | Status |
|---|---|---|---|---|
| **AUTH-01** | Register valid participant | Unique email, password min 8 chars, college | HTTP 201, JWT token returned, user persisted | PASS |
| **AUTH-02** | Prevent duplicate email registration | Existing registered email | HTTP 400 with duplicate email error | PASS |
| **AUTH-03** | Enforce strong password complexity | Password without numbers or symbols | HTTP 400 validation error | PASS |
| **AUTH-04** | Login with valid credentials | Correct email & password | HTTP 200, JWT token issued with user payload | PASS |
| **AUTH-05** | Reject invalid password | Correct email, wrong password | HTTP 401 "Invalid email or password" | PASS |
| **AUTH-06** | Reject non-existent email | Unregistered email | HTTP 401 "Invalid email or password" | PASS |
| **AUTH-07** | Rate limit brute-force logins | >50 login attempts within 15 mins | HTTP 429 "Too many attempts" | PASS |
| **AUTH-08** | Verify password update | Correct old password, valid new password | HTTP 200, DB hash updated | PASS |
| **AUTH-09** | Reject password update with incorrect current password | Wrong old password | HTTP 400 "Current password incorrect" | PASS |

---

## 2. Role-Based Access Control (RBAC) Test Suite

| Test ID | Test Scenario | Authenticated Role | Endpoint | Expected Result | Status |
|---|---|---|---|---|---|
| **RBAC-01** | Access Admin stats endpoint | Admin | `GET /api/admin/stats` | HTTP 200 OK | PASS |
| **RBAC-02** | Block non-admin from Admin stats | Participant | `GET /api/admin/stats` | HTTP 403 Forbidden | PASS |
| **RBAC-03** | Block Judge from creating hackathon | Judge | `POST /api/hackathons` | HTTP 403 Forbidden | PASS |
| **RBAC-04** | Allow Organiser to create hackathon | Organiser | `POST /api/hackathons` | HTTP 201 Created | PASS |
| **RBAC-05** | Block Participant from scoring submissions | Participant | `POST /api/submissions/:id/score` | HTTP 403 Forbidden | PASS |
| **RBAC-06** | Allow assigned Judge to score submissions | Judge | `POST /api/submissions/:id/score` | HTTP 200 OK | PASS |

---

## 3. Team Formation & QR Check-in Test Suite

| Test ID | Test Scenario | Input Data | Expected Result | Status |
|---|---|---|---|---|
| **TEAM-01** | Create team in approved hackathon | Valid team name (3-100 chars) | HTTP 201, 6-char unique uppercase invite code generated | PASS |
| **TEAM-02** | Prevent user from joining multiple teams in same hackathon | User already in Team A tries creating/joining Team B | HTTP 400 "You are already a member of a team in this hackathon" | PASS |
| **TEAM-03** | Join team via valid invite code | 6-char code | HTTP 200, user added to roster, checkin code generated | PASS |
| **TEAM-04** | Prevent joining team when max size reached | Max team size = 4 | HTTP 400 "Team is already at maximum capacity" | PASS |
| **TEAM-05** | Process valid attendee check-in | Valid attendee `chk_...` code | HTTP 200, `checked_in=1`, timestamp logged | PASS |
| **TEAM-06** | Reject check-in for unregistered attendee | Invalid check-in string | HTTP 404 "Attendee check-in code not found" | PASS |

---

## 4. Submissions & Deliverables Test Suite

| Test ID | Test Scenario | Input Data | Expected Result | Status |
|---|---|---|---|---|
| **SUB-01** | Submit valid project deliverables | Title, description, GitHub URL, Demo URL, ZIP file (<25MB) | HTTP 201, file saved to `/uploads/submissions/`, DB record created | PASS |
| **SUB-02** | Reject submission exceeding 25MB | File > 25MB | HTTP 400 "File size exceeds 25MB limit" | PASS |
| **SUB-03** | Edit project submission before deadline | Updated description & new demo URL | HTTP 200, record updated | PASS |
| **SUB-04** | Block submission edit after hackathon end_date | End date in past | HTTP 400 "Submission window has closed" | PASS |
| **SUB-05** | Withdraw submission by team leader | Leader calling withdrawal | HTTP 200, submission record removed | PASS |

---

## 5. Judging, Weighted Rubric & Leaderboard Test Suite

| Test ID | Test Scenario | Input Data | Expected Result | Status |
|---|---|---|---|---|
| **JUDGE-01** | Configure criteria with weights summing to 100% | 4 criteria with weights 40%, 30%, 20%, 10% | HTTP 201, criteria saved | PASS |
| **JUDGE-02** | Reject criteria when weights sum to ≠ 100% | Weights 30%, 30%, 30% (Sum = 90%) | HTTP 400 "Total criteria weights must equal exactly 100" | PASS |
| **JUDGE-03** | Score submission within 0-10 scale | Criterion score = 9.5 | HTTP 200, score saved | PASS |
| **JUDGE-04** | Reject score exceeding max_score | Criterion score = 15 | HTTP 400 validation error | PASS |
| **JUDGE-05** | Calculate multi-judge weighted average score | Judge 1: 90, Judge 2: 100 | Leaderboard calculates final score = 95.0 | PASS |
| **JUDGE-06** | Publish official results | Organiser triggers publish | HTTP 200, `results_published=1`, event emitted | PASS |

---

## 6. Certificates & Real-time Live Updates Test Suite

| Test ID | Test Scenario | Input Data | Expected Result | Status |
|---|---|---|---|---|
| **CERT-01** | Prevent certificate generation before results published | `results_published=0` | HTTP 400 "Certificates will be generated once official results are published" | PASS |
| **CERT-02** | Generate & stream valid PDF certificate | Authenticated participant, `results_published=1` | HTTP 200, `Content-Type: application/pdf`, valid `%PDF-` binary stream | PASS |
| **CERT-03** | Public verification of authentic certificate | Valid `CERT-HK1-U7-...` | HTTP 200, `valid: true`, recipient & rank details | PASS |
| **CERT-04** | Reject tampered or invalid certificate ID | `CERT-HK99-U99-INVALID` | HTTP 400 / 404 with `valid: false` | PASS |
| **RT-01** | Real-time leaderboard WebSocket broadcast | Judge scores submission | Socket event `leaderboard_updated` received by room attendees | PASS |
| **RT-02** | Real-time results published WebSocket broadcast | Organiser publishes results | Socket event `results_published` received by room attendees | PASS |
