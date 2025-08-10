const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Use environment variable for data storage or fallback to local
const DATA_DIR = process.env.DATA_DIR || './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EVENTS_DIR = path.join(DATA_DIR, 'events');

// In-memory storage as backup for Railway
let memoryStore = {
    users: {},
    events: {},
    settings: {}
};

// Initialize data directory
async function initDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(EVENTS_DIR, { recursive: true });
        
        // Try to load existing data
        try {
            const users = await fs.readFile(USERS_FILE, 'utf8');
            memoryStore.users = JSON.parse(users);
            console.log('Loaded users from file:', Object.keys(memoryStore.users));
        } catch {
            await fs.writeFile(USERS_FILE, JSON.stringify({}));
            console.log('Created new users file');
        }
        
        // Load existing events
        try {
            const eventFiles = await fs.readdir(EVENTS_DIR);
            for (const file of eventFiles) {
                if (file.endsWith('.json')) {
                    const username = file.replace('.json', '');
                    const events = JSON.parse(await fs.readFile(path.join(EVENTS_DIR, file), 'utf8'));
                    memoryStore.events[username] = events;
                    console.log(`Loaded ${events.length} events for user: ${username}`);
                }
            }
        } catch (error) {
            console.log('No existing events found');
        }
        
        console.log('Data directories initialized');
        console.log('Memory store initialized with:', {
            users: Object.keys(memoryStore.users).length,
            events: Object.keys(memoryStore.events).length,
            settings: Object.keys(memoryStore.settings).length
        });
    } catch (error) {
        console.error('Error initializing data directory:', error);
    }
}

// Save to both file and memory
async function saveData(type, key, data) {
    try {
        // Save to memory first
        if (type === 'users') {
            memoryStore.users = data;
            await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
        } else if (type === 'events') {
            memoryStore.events[key] = data;
            const eventsFile = path.join(EVENTS_DIR, `${key}.json`);
            await fs.writeFile(eventsFile, JSON.stringify(data, null, 2));
        } else if (type === 'settings') {
            memoryStore.settings[key] = data;
            const settingsFile = path.join(DATA_DIR, `settings_${key}.json`);
            await fs.writeFile(settingsFile, JSON.stringify(data, null, 2));
        }
        return true;
    } catch (error) {
        console.error(`Error saving ${type}:`, error);
        // Even if file save fails, we have it in memory
        return false;
    }
}

// Load from memory or file
async function loadData(type, key) {
    try {
        if (type === 'users') {
            return memoryStore.users;
        } else if (type === 'events') {
            if (memoryStore.events[key]) {
                return memoryStore.events[key];
            }
            // Try to load from file if not in memory
            const eventsFile = path.join(EVENTS_DIR, `${key}.json`);
            const events = JSON.parse(await fs.readFile(eventsFile, 'utf8'));
            memoryStore.events[key] = events;
            return events;
        } else if (type === 'settings') {
            if (memoryStore.settings[key]) {
                return memoryStore.settings[key];
            }
            const settingsFile = path.join(DATA_DIR, `settings_${key}.json`);
            const settings = JSON.parse(await fs.readFile(settingsFile, 'utf8'));
            memoryStore.settings[key] = settings;
            return settings;
        }
    } catch (error) {
        console.log(`No ${type} data found for ${key}`);
        return null;
    }
}

// Health check with data status
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.RAILWAY_ENVIRONMENT || 'local',
        dataStatus: {
            users: Object.keys(memoryStore.users).length,
            events: Object.keys(memoryStore.events).length,
            settings: Object.keys(memoryStore.settings).length
        }
    });
});

// Debug endpoint to see all data
app.get('/api/debug/data', (req, res) => {
    res.json({
        memoryStore: {
            users: Object.keys(memoryStore.users),
            events: Object.keys(memoryStore.events).map(user => ({
                user,
                eventCount: memoryStore.events[user].length
            })),
            settings: Object.keys(memoryStore.settings)
        },
        environment: process.env.RAILWAY_ENVIRONMENT || 'local'
    });
});

// Export all data (for backup)
app.get('/api/backup/all', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        data: memoryStore
    });
});

// Import all data (for restore)
app.post('/api/restore/all', async (req, res) => {
    try {
        const { data } = req.body;
        
        if (data.users) {
            await saveData('users', null, data.users);
        }
        
        if (data.events) {
            for (const [username, events] of Object.entries(data.events)) {
                await saveData('events', username, events);
            }
        }
        
        if (data.settings) {
            for (const [username, settings] of Object.entries(data.settings)) {
                await saveData('settings', username, settings);
            }
        }
        
        res.json({ success: true, message: 'Data restored successfully' });
    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Restore failed' });
    }
});

// User login/register
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    try {
        const users = await loadData('users') || {};
        
        if (users[username]) {
            if (users[username].password === password) {
                users[username].lastLogin = new Date().toISOString();
                await saveData('users', null, users);
                res.json({ success: true, username });
            } else {
                res.status(401).json({ error: '密码错误' });
            }
        } else {
            // Register new user
            users[username] = { 
                password, 
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            await saveData('users', null, users);
            
            // Initialize empty events
            await saveData('events', username, []);
            
            res.json({ success: true, username, newUser: true });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// Get events
app.get('/api/events/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const events = await loadData('events', username) || [];
        console.log(`Serving ${events.length} events for user: ${username}`);
        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        res.json([]);
    }
});

// Save events
app.post('/api/events/:username', async (req, res) => {
    const { username } = req.params;
    const events = req.body;
    
    try {
        await saveData('events', username, events);
        console.log(`Saved ${events.length} events for user: ${username}`);
        res.json({ success: true, saved: events.length });
    } catch (error) {
        console.error('Save events error:', error);
        res.status(500).json({ error: '保存失败' });
    }
});

// Get settings
app.get('/api/settings/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const settings = await loadData('settings', username) || { timeRange: { start: '07:00', end: '22:00' } };
        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.json({ timeRange: { start: '07:00', end: '22:00' } });
    }
});

// Save settings
app.post('/api/settings/:username', async (req, res) => {
    const { username } = req.params;
    const settings = req.body;
    
    try {
        await saveData('settings', username, settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: '保存设置失败' });
    }
});

// Get user data status
app.get('/api/status/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const events = await loadData('events', username) || [];
        const settings = await loadData('settings', username);
        
        res.json({
            eventsCount: events.length,
            settingsExists: !!settings,
            lastCheck: new Date().toISOString(),
            inMemory: {
                events: !!memoryStore.events[username],
                settings: !!memoryStore.settings[username]
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: '状态检查失败' });
    }
});

// Serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Graceful shutdown - save all data
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, saving data...');
    try {
        // Save all memory data to files
        await saveData('users', null, memoryStore.users);
        for (const [username, events] of Object.entries(memoryStore.events)) {
            await saveData('events', username, events);
        }
        for (const [username, settings] of Object.entries(memoryStore.settings)) {
            await saveData('settings', username, settings);
        }
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data on shutdown:', error);
    }
    process.exit(0);
});

// Start server
initDataDir().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Calendar app is running on port ${PORT}`);
        console.log(`Environment: ${process.env.RAILWAY_ENVIRONMENT || 'local'}`);
        console.log('Health check: /api/health');
        console.log('Debug data: /api/debug/data');
        console.log('Backup: /api/backup/all');
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});