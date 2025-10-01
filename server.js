
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 5000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// JSON file paths
const DATA_DIR = './';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const THREADS_FILE = path.join(DATA_DIR, 'threads.json');
const THREAD_MESSAGES_FILE = path.join(DATA_DIR, 'thread_messages.json');

// Helper functions for JSON file operations
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultValue;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

const initializeDatabase = async () => {
  try {
    // Initialize users if empty
    const users = await readJsonFile(USERS_FILE);
    if (users.length === 0) {
      const defaultUsers = [
        { id: 1, username: 'jupiter', password: await bcrypt.hash('123es123as', 10), role: 'admin', avatar: null, bio: null, theme: 'dark', created_at: new Date().toISOString() },
        { id: 2, username: 'khaedus', password: await bcrypt.hash('coolgang57', 10), role: 'admin', avatar: null, bio: null, theme: 'dark', created_at: new Date().toISOString() },
        { id: 3, username: 'malte', password: await bcrypt.hash('maltese21', 10), role: 'admin', avatar: null, bio: null, theme: 'dark', created_at: new Date().toISOString() }
      ];
      await writeJsonFile(USERS_FILE, defaultUsers);
    }

    // Initialize other files if they don't exist
    await readJsonFile(GAMES_FILE);
    await readJsonFile(COMMENTS_FILE);
    await readJsonFile(REQUESTS_FILE);
    await readJsonFile(THREADS_FILE);
    await readJsonFile(THREAD_MESSAGES_FILE);

    // Create uploads directory if it doesn't exist
    try {
      await fs.access('./uploads');
    } catch {
      await fs.mkdir('./uploads');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

initializeDatabase();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-please-change';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readJsonFile(USERS_FILE);
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar, bio: user.bio, theme: user.theme }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readJsonFile(USERS_FILE);
    
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      username,
      password: hashedPassword,
      role: 'basic',
      avatar: null,
      bio: null,
      theme: 'dark',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    await writeJsonFile(USERS_FILE, users);

    const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { id: newUser.id, username: newUser.username, role: newUser.role, avatar: newUser.avatar, bio: newUser.bio, theme: newUser.theme }, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await readJsonFile(USERS_FILE);
    const safeUsers = users.map(u => ({ id: u.id, username: u.username, role: u.role, avatar: u.avatar, bio: u.bio, theme: u.theme, created_at: u.created_at }));
    res.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const users = await readJsonFile(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users[userIndex].role = role;
    await writeJsonFile(USERS_FILE, users);
    res.json({ success: true });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const users = await readJsonFile(USERS_FILE);
    const filteredUsers = users.filter(u => u.id !== parseInt(id));
    await writeJsonFile(USERS_FILE, filteredUsers);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/api/users/:id/profile', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Can only update your own profile' });
    }
    
    const { avatar, bio, theme, banner, avatarUrl } = req.body;
    const users = await readJsonFile(USERS_FILE);
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users[userIndex].avatar = avatar;
    users[userIndex].avatarUrl = avatarUrl;
    users[userIndex].banner = banner;
    users[userIndex].bio = bio;
    users[userIndex].theme = theme;
    await writeJsonFile(USERS_FILE, users);

    const updatedUser = { 
      id: users[userIndex].id, 
      username: users[userIndex].username, 
      role: users[userIndex].role, 
      avatar: users[userIndex].avatar,
      avatarUrl: users[userIndex].avatarUrl,
      banner: users[userIndex].banner,
      bio: users[userIndex].bio, 
      theme: users[userIndex].theme 
    };
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// File upload endpoints
app.post('/api/upload/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

app.post('/api/upload/banner', authenticateToken, upload.single('banner'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const games = await readJsonFile(GAMES_FILE);
    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

app.post('/api/games', authenticateToken, requireRole('admin', 'gameadder'), async (req, res) => {
  try {
    const game = req.body;
    const games = await readJsonFile(GAMES_FILE);
    
    const newGame = {
      id: Math.max(0, ...games.map(g => g.id || 0)) + 1,
      title: game.title,
      developer: game.developer,
      publisher: game.publisher,
      release_date: game.releaseDate,
      short_description: game.shortDescription,
      full_description: game.fullDescription,
      genre: game.genre,
      tags: game.tags,
      rating: game.rating,
      difficulty: game.difficulty,
      image: game.image,
      download_link: game.downloadLink,
      file_size: game.fileSize,
      requirements: game.requirements,
      notes: game.notes,
      added_by: game.addedBy,
      timestamp: game.timestamp
    };

    games.push(newGame);
    await writeJsonFile(GAMES_FILE, games);
    res.json(newGame);
  } catch (error) {
    console.error('Add game error:', error);
    res.status(500).json({ error: 'Failed to add game' });
  }
});

app.delete('/api/games/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const games = await readJsonFile(GAMES_FILE);
    const filteredGames = games.filter(g => g.id !== parseInt(id));
    await writeJsonFile(GAMES_FILE, filteredGames);

    // Also delete related comments
    const comments = await readJsonFile(COMMENTS_FILE);
    const filteredComments = comments.filter(c => c.game_id !== parseInt(id));
    await writeJsonFile(COMMENTS_FILE, filteredComments);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

app.get('/api/comments', async (req, res) => {
  try {
    const { gameId } = req.query;
    const comments = await readJsonFile(COMMENTS_FILE);
    
    let filteredComments = comments;
    if (gameId) {
      filteredComments = comments.filter(c => c.game_id === parseInt(gameId));
    }
    
    filteredComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(filteredComments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const { gameId, text } = req.body;
    const comments = await readJsonFile(COMMENTS_FILE);
    
    const newComment = {
      id: Math.max(0, ...comments.map(c => c.id || 0)) + 1,
      game_id: parseInt(gameId),
      author: req.user.username,
      role: req.user.role,
      text,
      likes: [],
      timestamp: new Date().toISOString()
    };

    comments.push(newComment);
    await writeJsonFile(COMMENTS_FILE, comments);
    res.json(newComment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.put('/api/comments/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await readJsonFile(COMMENTS_FILE);
    const commentIndex = comments.findIndex(c => c.id === parseInt(id));
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const likes = comments[commentIndex].likes || [];
    const userIndex = likes.indexOf(req.user.username);
    
    if (userIndex > -1) {
      likes.splice(userIndex, 1);
    } else {
      likes.push(req.user.username);
    }
    
    comments[commentIndex].likes = likes;
    await writeJsonFile(COMMENTS_FILE, comments);
    res.json(comments[commentIndex]);
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await readJsonFile(COMMENTS_FILE);
    const comment = comments.find(c => c.id === parseInt(id));
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    if (comment.author !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Can only delete your own comments' });
    }
    
    const filteredComments = comments.filter(c => c.id !== parseInt(id));
    await writeJsonFile(COMMENTS_FILE, filteredComments);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await readJsonFile(REQUESTS_FILE);
    
    let filteredRequests = requests;
    if (req.user.role !== 'admin') {
      filteredRequests = requests.filter(r => r.username === req.user.username);
    }
    
    filteredRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(filteredRequests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.post('/api/requests', authenticateToken, async (req, res) => {
  try {
    const { steamId, gameName, notes } = req.body;
    const requests = await readJsonFile(REQUESTS_FILE);
    
    const newRequest = {
      id: Math.max(0, ...requests.map(r => r.id || 0)) + 1,
      steam_id: steamId,
      game_name: gameName,
      notes,
      username: req.user.username,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    requests.push(newRequest);
    await writeJsonFile(REQUESTS_FILE, requests);
    res.json(newRequest);
  } catch (error) {
    console.error('Add request error:', error);
    res.status(500).json({ error: 'Failed to add request' });
  }
});

app.put('/api/requests/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const requests = await readJsonFile(REQUESTS_FILE);
    const requestIndex = requests.findIndex(r => r.id === parseInt(id));
    
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    requests[requestIndex].status = status;
    await writeJsonFile(REQUESTS_FILE, requests);
    res.json(requests[requestIndex]);
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

app.delete('/api/requests/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const requests = await readJsonFile(REQUESTS_FILE);
    const filteredRequests = requests.filter(r => r.id !== parseInt(id));
    await writeJsonFile(REQUESTS_FILE, filteredRequests);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// Favorites and ratings will use separate JSON files
app.get('/api/favorites/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Can only access your own favorites' });
    }
    
    const games = await readJsonFile(GAMES_FILE);
    const favorites = await readJsonFile('./favorites.json', []);
    const userFavorites = favorites.filter(f => f.user_id === parseInt(userId));
    const favoriteGames = games.filter(g => userFavorites.some(f => f.game_id === g.id));
    
    res.json(favoriteGames);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.body;
    const favorites = await readJsonFile('./favorites.json', []);
    
    const existing = favorites.find(f => f.user_id === req.user.id && f.game_id === parseInt(gameId));
    if (!existing) {
      const newFavorite = {
        id: Math.max(0, ...favorites.map(f => f.id || 0)) + 1,
        user_id: req.user.id,
        game_id: parseInt(gameId),
        created_at: new Date().toISOString()
      };
      favorites.push(newFavorite);
      await writeJsonFile('./favorites.json', favorites);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:userId/:gameId', authenticateToken, async (req, res) => {
  try {
    const { userId, gameId } = req.params;
    
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Can only modify your own favorites' });
    }
    
    const favorites = await readJsonFile('./favorites.json', []);
    const filteredFavorites = favorites.filter(f => !(f.user_id === parseInt(userId) && f.game_id === parseInt(gameId)));
    await writeJsonFile('./favorites.json', filteredFavorites);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

app.get('/api/ratings/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const ratings = await readJsonFile('./ratings.json', []);
    const users = await readJsonFile(USERS_FILE);
    
    const gameRatings = ratings.filter(r => r.game_id === parseInt(gameId));
    const ratingsWithUsernames = gameRatings.map(r => {
      const user = users.find(u => u.id === r.user_id);
      return { ...r, username: user ? user.username : 'Unknown' };
    });
    
    res.json(ratingsWithUsernames);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

app.post('/api/ratings', authenticateToken, async (req, res) => {
  try {
    const { gameId, rating, review } = req.body;
    const ratings = await readJsonFile('./ratings.json', []);
    
    const existingIndex = ratings.findIndex(r => r.user_id === req.user.id && r.game_id === parseInt(gameId));
    
    const newRating = {
      id: existingIndex === -1 ? Math.max(0, ...ratings.map(r => r.id || 0)) + 1 : ratings[existingIndex].id,
      user_id: req.user.id,
      game_id: parseInt(gameId),
      rating: parseInt(rating),
      review,
      created_at: new Date().toISOString()
    };
    
    if (existingIndex === -1) {
      ratings.push(newRating);
    } else {
      ratings[existingIndex] = newRating;
    }
    
    await writeJsonFile('./ratings.json', ratings);
    res.json(newRating);
  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({ error: 'Failed to add rating' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const games = await readJsonFile(GAMES_FILE);
    const users = await readJsonFile(USERS_FILE);
    const comments = await readJsonFile(COMMENTS_FILE);
    
    res.json({
      games: games.length,
      users: users.length,
      comments: comments.length
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Chat system endpoints
app.get('/api/threads', async (req, res) => {
  try {
    const threads = await readJsonFile(THREADS_FILE);
    const sortedThreads = threads.sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
    res.json(sortedThreads);
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

app.post('/api/threads', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const threads = await readJsonFile(THREADS_FILE);
    
    const newThread = {
      id: Math.max(0, ...threads.map(t => t.id || 0)) + 1,
      title,
      content,
      author: req.user.username,
      author_role: req.user.role,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      message_count: 0,
      locked: false
    };

    threads.push(newThread);
    await writeJsonFile(THREADS_FILE, threads);
    res.json(newThread);
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

app.get('/api/threads/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await readJsonFile(THREAD_MESSAGES_FILE);
    const threadMessages = messages.filter(m => m.thread_id === parseInt(id));
    threadMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    res.json(threadMessages);
  } catch (error) {
    console.error('Get thread messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/threads/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    const messages = await readJsonFile(THREAD_MESSAGES_FILE);
    const threads = await readJsonFile(THREADS_FILE);
    
    const newMessage = {
      id: Math.max(0, ...messages.map(m => m.id || 0)) + 1,
      thread_id: parseInt(id),
      content,
      author: req.user.username,
      author_role: req.user.role,
      created_at: new Date().toISOString(),
      likes: []
    };

    messages.push(newMessage);
    await writeJsonFile(THREAD_MESSAGES_FILE, messages);

    // Update thread last activity and message count
    const threadIndex = threads.findIndex(t => t.id === parseInt(id));
    if (threadIndex !== -1) {
      threads[threadIndex].last_activity = new Date().toISOString();
      threads[threadIndex].message_count = messages.filter(m => m.thread_id === parseInt(id)).length;
      await writeJsonFile(THREADS_FILE, threads);
    }

    res.json(newMessage);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

app.put('/api/threads/:threadId/messages/:messageId/like', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messages = await readJsonFile(THREAD_MESSAGES_FILE);
    const messageIndex = messages.findIndex(m => m.id === parseInt(messageId));
    
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const likes = messages[messageIndex].likes || [];
    const userIndex = likes.indexOf(req.user.username);
    
    if (userIndex > -1) {
      likes.splice(userIndex, 1);
    } else {
      likes.push(req.user.username);
    }
    
    messages[messageIndex].likes = likes;
    await writeJsonFile(THREAD_MESSAGES_FILE, messages);
    res.json(messages[messageIndex]);
  } catch (error) {
    console.error('Toggle message like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

app.delete('/api/threads/:threadId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messages = await readJsonFile(THREAD_MESSAGES_FILE);
    const message = messages.find(m => m.id === parseInt(messageId));
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.author !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }
    
    const filteredMessages = messages.filter(m => m.id !== parseInt(messageId));
    await writeJsonFile(THREAD_MESSAGES_FILE, filteredMessages);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
