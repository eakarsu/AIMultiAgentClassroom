require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { pool, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'classroom-secret';

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : req.ip),
  message: { error: 'Too many AI requests. Please wait before retrying.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/ai/', aiRateLimiter);

// Make pool and rate limiter available to routes
app.locals.pool = pool;
app.locals.aiRateLimiter = aiRateLimiter;

// JWT auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Routes
const authRoutes = require('./routes/auth');
const classroomRoutes = require('./routes/classroom');
const aiRoutes = require('./routes/ai');
const teacherRoutes = require('./routes/teacher');

app.use('/api/auth', authRoutes);
app.use('/api/classroom', authenticateToken, classroomRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/teacher', authenticateToken, teacherRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AI Multi-Agent Classroom', timestamp: new Date().toISOString() });
});

// === Custom Views (4 endpoints) — MUST be mounted BEFORE the 404 handler ===
try {
  app.use('/api/custom-views', require('./routes/customViews'));
} catch (e) {
  console.error('custom-views mount fail:', e.message);
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const start = async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`AI Multi-Agent Classroom backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

// === BATCH 05 AUTO-MOUNT (custom feature suggestions) ===
app.use('/api/multi-modal-tutor', require('./routes/multi-modal-tutor'));
app.use('/api/misconception-realtime', require('./routes/misconception-realtime'));
app.use('/api/socratic-dialogue', require('./routes/socratic-dialogue'));
app.use('/api/path-personalizer', require('./routes/path-personalizer'));
app.use('/api/voice-learning', require('./routes/voice-learning'));

// === Batch 05 Gaps & Frontend Mounts ===
try { const _gap_misconception_detection = require('./routes/gap-misconception-detection'); app.use('/api/gap-misconception-detection', _gap_misconception_detection); } catch(e) { console.error('gap mount fail misconception-detection:', e.message); }
try { const _gap_difficulty_adapt = require('./routes/gap-difficulty-adapt'); app.use('/api/gap-difficulty-adapt', _gap_difficulty_adapt); } catch(e) { console.error('gap mount fail difficulty-adapt:', e.message); }
try { const _gap_peer_collaboration_suggestion = require('./routes/gap-peer-collaboration-suggestion'); app.use('/api/gap-peer-collaboration-suggestion', _gap_peer_collaboration_suggestion); } catch(e) { console.error('gap mount fail peer-collaboration-suggestion:', e.message); }
try { const _gap_parent_progress_narrative = require('./routes/gap-parent-progress-narrative'); app.use('/api/gap-parent-progress-narrative', _gap_parent_progress_narrative); } catch(e) { console.error('gap mount fail parent-progress-narrative:', e.message); }
try { const _gap_dedicated = require('./routes/gap-dedicated'); app.use('/api/gap-dedicated', _gap_dedicated); } catch(e) { console.error('gap mount fail dedicated:', e.message); }
try { const _gap_assignments = require('./routes/gap-assignments'); app.use('/api/gap-assignments', _gap_assignments); } catch(e) { console.error('gap mount fail assignments:', e.message); }
try { const _gap_curriculum = require('./routes/gap-curriculum'); app.use('/api/gap-curriculum', _gap_curriculum); } catch(e) { console.error('gap mount fail curriculum:', e.message); }
try { const _gap_grade = require('./routes/gap-grade'); app.use('/api/gap-grade', _gap_grade); } catch(e) { console.error('gap mount fail grade:', e.message); }
try { const _gap_parent = require('./routes/gap-parent'); app.use('/api/gap-parent', _gap_parent); } catch(e) { console.error('gap mount fail parent:', e.message); }
try { const _gap_notifications = require('./routes/gap-notifications'); app.use('/api/gap-notifications', _gap_notifications); } catch(e) { console.error('gap mount fail notifications:', e.message); }
try { const _gap_authentication = require('./routes/gap-authentication'); app.use('/api/gap-authentication', _gap_authentication); } catch(e) { console.error('gap mount fail authentication:', e.message); }
try { const _gap_mobile = require('./routes/gap-mobile'); app.use('/api/gap-mobile', _gap_mobile); } catch(e) { console.error('gap mount fail mobile:', e.message); }
// === End Batch 05 Mounts ===
