# HackHub hackathon module test cases

| ID | Feature | Expected result |
|---|---|---|
| TC01 | Create hackathon with valid organiser token | 201 and an id |
| TC02 | Create hackathon without a token | 401 |
| TC03 | Create hackathon as participant | 403 |
| TC04 | Create with a one-character title | 400 validation error |
| TC05 | Registration end before start | 400 validation error |
| TC06 | Upload a PDF banner | 400 validation error |
| TC07 | Upload a banner over 2 MB | 400 validation error |
| TC08 | Upload a valid PNG banner | 201 and banner path |
| TC09 | List hackathons publicly | 200 and approved records only |
| TC10 | Search by title or description | 200 and matching records |
| TC11 | Filter by status and theme | 200 and filtered records |
| TC12 | Request a later page | 200 with pagination metadata |
| TC13 | Search with SQL-like input | 200 without SQL injection |
| TC14 | Get an approved hackathon by id | 200 with organiser name |
| TC15 | Get a missing hackathon | 404 |
| TC16 | Get a non-numeric id | 400 |
| TC17 | Update as owner | 200 |
| TC18 | Update as another organiser | 403 |
| TC19 | Delete as owner, then fetch | 200 followed by 404 |
| TC20 | Post an announcement as owner | 201 and participant notifications |
| TC21 | Post an announcement as another organiser | 403 |
| TC22 | Post a two-character announcement | 400 |
| TC23 | Delete an announcement as owner | 200 |
| TC24 | List own notifications | 200 with unread count |
| TC25 | Mark another user's notification read | 404 |
| TC26 | Mark all notifications read | 200 and unread count becomes zero |
| TC27 | Post an announcement with mail configured | Participants receive email |
| TC28 | Export participants as owner | 200 CSV download |
| TC29 | Export another organiser's participants | 403 |
