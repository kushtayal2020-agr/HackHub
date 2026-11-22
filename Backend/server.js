
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./database/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const hackathonRoutes = require('./routes/hackathons');

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

app.use(express.json());

app.use(
    '/uploads',
    express.static(path.join(__dirname, 'uploads'))
);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        message: 'Too many attempts. Try again after 15 minutes.'
    }
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'HackHub API is running'
    });
});

app.get('/api/db-check', async (req, res) => {
    try {
        await db.query('SELECT 1');

        res.status(200).json({
            status: 'success',
            message: 'MySQL database connected successfully!'
        });
    } catch (error) {
        console.error('Database connection error:', error.message);

        res.status(500).json({
            status: 'error',
            message: 'Database connection failed'
        });
    }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api', announcementRoutes);
app.use('/api/notifications', require('./routes/notifications'));

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found.'
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`HackHub API running on port ${PORT}`);
});
