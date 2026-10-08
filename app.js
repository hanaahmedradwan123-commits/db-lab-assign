require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'YOUR_MYSQL_PASSWORD_HERE',
    database: process.env.DB_NAME || 'registration',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// GET /register
app.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('register', { errors: [], formData: {} });
});

// POST /register
app.post('/register', async (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push('Name is required');
    if (!email || !email.trim()) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (!confirm_password) errors.push('Confirm password is required');
    if (password && confirm_password && password !== confirm_password) {
        errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
        return res.render('register', { errors, formData: { name, email } });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)';
        const [result] = await pool.execute(sql, [email.trim(), name.trim(), hashedPassword]);

        req.session.userId = result.insertId;
        req.session.userName = name.trim();
        res.redirect('/');
   } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.render('register', { 
                errors: ['Email Already Exists'], 
                formData: { name, email } 
            });
        }
        console.error('REGISTRATION ERROR:', err);
        res.status(500).send('Database Error: ' + err.message);
    }
});

// GET /login
app.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('login', { errors: [], formData: {} });
});

// POST /login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !email.trim()) errors.push('Email is required');
    if (!password) errors.push('Password is required');

    if (errors.length > 0) {
        return res.render('login', { errors, formData: { email } });
    }

    try {
        const sql = 'SELECT user_id, name, password_hash FROM users WHERE email = ?';
        const [rows] = await pool.execute(sql, [email.trim()]);

        if (rows.length === 0) {
            return res.render('login', { 
                errors: ['Invalid email or password'], 
                formData: { email } 
            });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.render('login', { 
                errors: ['Invalid email or password'], 
                formData: { email } 
            });
        }

        req.session.userId = user.user_id;
        req.session.userName = user.name;
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

// POST /logout
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// GET /
app.get('/', requireAuth, async (req, res) => {
    try {
        const sql = 'SELECT todo_id, title, is_done, created_at FROM todos WHERE user_id = ? ORDER BY todo_id DESC';
        const [todos] = await pool.execute(sql, [req.session.userId]);
        
        res.render('todos', { 
            userName: req.session.userName, 
            todos, 
            errors: [] 
        });
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

// POST /todos/add
app.post('/todos/add', requireAuth, async (req, res) => {
    const { title } = req.body;
    const errors = [];

    if (!title || !title.trim()) {
        errors.push('Title is required');
    } else if (title.trim().length > 200) {
        errors.push('Title is too long');
    }

    if (errors.length > 0) {
        const sql = 'SELECT todo_id, title, is_done, created_at FROM todos WHERE user_id = ? ORDER BY todo_id DESC';
        const [todos] = await pool.execute(sql, [req.session.userId]);
        return res.render('todos', { userName: req.session.userName, todos, errors });
    }

    try {
        const sql = 'INSERT INTO todos (user_id, title) VALUES (?, ?)';
        await pool.execute(sql, [req.session.userId, title.trim()]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

// POST /todos/edit
app.post('/todos/edit', requireAuth, async (req, res) => {
    const { todo_id, title } = req.body;
    
    if (!title || !title.trim() || title.trim().length > 200) {
        return res.redirect('/');
    }

    try {
        const sql = 'UPDATE todos SET title = ? WHERE todo_id = ? AND user_id = ?';
        await pool.execute(sql, [title.trim(), todo_id, req.session.userId]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

// POST /todos/toggle
app.post('/todos/toggle', requireAuth, async (req, res) => {
    const { todo_id, is_done } = req.body;
    const newStatus = is_done === '1' ? 0 : 1;

    try {
        const sql = 'UPDATE todos SET is_done = ? WHERE todo_id = ? AND user_id = ?';
        await pool.execute(sql, [newStatus, todo_id, req.session.userId]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

// POST /todos/delete
app.post('/todos/delete', requireAuth, async (req, res) => {
    const { todo_id } = req.body;

    try {
        const sql = 'DELETE FROM todos WHERE todo_id = ? AND user_id = ?';
        await pool.execute(sql, [todo_id, req.session.userId]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Database Error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));