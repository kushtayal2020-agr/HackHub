const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');

const SALT_ROUNDS = 10;
const DEMO_PASSWORD = 'Demo@1234';

const DEMO_USERS = [
  { name: 'System Admin', email: 'admin@hackhub.test', role: 'admin', college: 'Tech University' },
  { name: 'Lead Organiser', email: 'organiser@hackhub.test', role: 'organiser', college: 'National Institute' },
  { name: 'Chief Judge', email: 'judge@hackhub.test', role: 'judge', college: 'Innovation Council' },
  { name: 'Alice Walker', email: 'participant@hackhub.test', role: 'participant', college: 'Apex Engineering College' },
  { name: 'Bob Smith', email: 'participant2@hackhub.test', role: 'participant', college: 'Apex Engineering College' },
];

async function seedDemo() {
  console.log('Seeding demo data for HackHub...');
  const hash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  // 1. Seed demo users
  const userMap = {};
  for (const u of DEMO_USERS) {
    const [existing] = await db.query('SELECT id, role FROM users WHERE email = ?', [u.email]);
    if (existing.length > 0) {
      userMap[u.role] = existing[0].id;
      if (u.role === 'admin') userMap.admin = existing[0].id;
      if (u.email === 'participant2@hackhub.test') userMap.participant2 = existing[0].id;
      console.log(`User ${u.email} already exists (ID ${existing[0].id}).`);
    } else {
      const [res] = await db.query(
        'INSERT INTO users (name, email, password_hash, role, college, is_approved, is_blocked) VALUES (?, ?, ?, ?, ?, 1, 0)',
        [u.name, u.email, hash, u.role, u.college]
      );
      userMap[u.role] = res.insertId;
      if (u.role === 'admin') userMap.admin = res.insertId;
      if (u.email === 'participant2@hackhub.test') userMap.participant2 = res.insertId;
      console.log(`Created user ${u.email} (ID ${res.insertId}).`);
    }
  }

  const organiserId = userMap.organiser;
  const judgeId = userMap.judge;

  // 2. Seed approved hackathon if none exists for this organiser
  const [existingHacks] = await db.query(
    'SELECT id FROM hackathons WHERE organiser_id = ? AND title = ?',
    [organiserId, 'HackHub National Innovation Challenge 2026']
  );

  let hackathonId;
  if (existingHacks.length > 0) {
    hackathonId = existingHacks[0].id;
    console.log(`Hackathon already exists (ID ${hackathonId}).`);
  } else {
    const now = new Date();
    const regStart = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const regEnd = new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const startDate = new Date(now.getTime() + 6 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const endDate = new Date(now.getTime() + 8 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const [res] = await db.query(
      `INSERT INTO hackathons (
        organiser_id, title, description, theme, rules, prizes, banner_path,
        registration_start, registration_end, start_date, end_date, max_team_size, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [
        organiserId,
        'HackHub National Innovation Challenge 2026',
        'National college hackathon showcasing breakthrough projects in Artificial Intelligence, Cloud Services, and Distributed Systems.',
        'AI & Machine Learning',
        'Teams must submit original code developed during the sprint. All repositories must be open source.',
        '1st Place: ₹50,000 | 2nd Place: ₹30,000 | 3rd Place: ₹20,000',
        'images/banner-ai.jpg',
        regStart,
        regEnd,
        startDate,
        endDate,
        4,
      ]
    );
    hackathonId = res.insertId;
    console.log(`Created approved demo hackathon (ID ${hackathonId}).`);
  }

  // 3. Seed 100-weight rubric criteria
  const criteriaList = [
    { name: 'Innovation & Novelty', weight: 30, max_score: 10 },
    { name: 'Technical Complexity', weight: 40, max_score: 10 },
    { name: 'Presentation & UI', weight: 30, max_score: 10 },
  ];

  for (const c of criteriaList) {
    const [existingCrit] = await db.query(
      'SELECT id FROM criteria WHERE hackathon_id = ? AND name = ?',
      [hackathonId, c.name]
    );
    if (existingCrit.length === 0) {
      await db.query(
        'INSERT INTO criteria (hackathon_id, name, weight, max_score) VALUES (?, ?, ?, ?)',
        [hackathonId, c.name, c.weight, c.max_score]
      );
      console.log(`Added criterion: ${c.name} (${c.weight}%)`);
    }
  }

  // 4. Assign judge to hackathon
  const [existingAssignment] = await db.query(
    'SELECT id FROM judge_assignments WHERE hackathon_id = ? AND judge_id = ?',
    [hackathonId, judgeId]
  );
  if (existingAssignment.length === 0) {
    await db.query(
      'INSERT INTO judge_assignments (hackathon_id, judge_id) VALUES (?, ?)',
      [hackathonId, judgeId]
    );
    console.log(`Assigned judge ${judgeId} to hackathon ${hackathonId}.`);
  }

  console.log('Demo data seeded successfully!');
  if (db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('Failed to seed demo data:', err.message);
  process.exit(1);
});
