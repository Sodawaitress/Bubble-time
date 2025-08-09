const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Simple file-based storage
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EVENTS_DIR = path.join(DATA_DIR, 'events');

// Initialize data directory
async function initDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(EVENTS_DIR, { recursive: true });
        
        try {
            await fs.access(USERS_FILE);
        } catch {
            await fs.writeFile(USERS_FILE, JSON.stringify({}));
        }
    } catch (error) {
        console.error('Error initializing data directory:', error);
    }
}

// API Routes

// User login/register
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        
        if (users[username]) {
            if (users[username].password === password) {
                res.json({ success: true, username });
            } else {
                res.status(401).json({ error: '密码错误' });
            }
        } else {
            // Register new user
            users[username] = { password, createdAt: new Date().toISOString() };
            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
            res.json({ success: true, username, newUser: true });
        }
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// Get events
app.get('/api/events/:username', async (req, res) => {
    const { username } = req.params;
    const eventsFile = path.join(EVENTS_DIR, `${username}.json`);
    
    try {
        const events = JSON.parse(await fs.readFile(eventsFile, 'utf8'));
        res.json(events);
    } catch {
        res.json([]);
    }
});

// Save events
app.post('/api/events/:username', async (req, res) => {
    const { username } = req.params;
    const events = req.body;
    const eventsFile = path.join(EVENTS_DIR, `${username}.json`);
    
    try {
        await fs.writeFile(eventsFile, JSON.stringify(events, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '保存失败' });
    }
});

// Get settings
app.get('/api/settings/:username', async (req, res) => {
    const { username } = req.params;
    const settingsFile = path.join(DATA_DIR, `settings_${username}.json`);
    
    try {
        const settings = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
        res.json(settings);
    } catch {
        res.json({ timeRange: { start: '07:00', end: '22:00' } });
    }
});

// Save settings
app.post('/api/settings/:username', async (req, res) => {
    const { username } = req.params;
    const settings = req.body;
    const settingsFile = path.join(DATA_DIR, `settings_${username}.json`);
    
    try {
        await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '保存设置失败' });
    }
});

// Serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
initDataDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Calendar app is running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT}`);
    });
});