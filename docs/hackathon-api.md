# Hackathon module - API design

| # | Method | URL | Who can call | Success | Errors |
|---|--------|-----|--------------|---------|--------|
| 1 | POST | `/api/hackathons` | Organiser | 201 | 400, 401, 403 |
| 2 | GET | `/api/hackathons` | Public | 200 | - |
| 3 | GET | `/api/hackathons/themes` | Public | 200 | - |
| 4 | GET | `/api/hackathons/mine` | Organiser | 200 | 401, 403 |
| 5 | GET | `/api/hackathons/mine/:id` | Organiser (owner) | 200 | 400, 401, 403, 404 |
| 6 | GET | `/api/hackathons/:id` | Public | 200 | 400, 404 |
| 7 | PUT | `/api/hackathons/:id` | Organiser (owner) | 200 | 400, 401, 403, 404 |
| 8 | DELETE | `/api/hackathons/:id` | Organiser (owner) or admin | 200 | 400, 401, 403, 404 |

New hackathons start as `pending` and only approved hackathons appear in public results. The
`upcoming`, `live`, or `completed` status is calculated from the event dates and is never stored.
Only the organiser who created a hackathon can update it.

The public list accepts `search`, `theme`, `status`, `page`, and `limit` query parameters. Results
are paginated, with a maximum page size of 50.
