class SteamtoolsApp {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.currentPage = 'home';
        this.currentGameId = null;
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.setupEventListeners();
        await this.renderPage();
        await this.updateStats();
    }

    async loadCurrentUser() {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('current_user');
        if (token && userData) {
            this.token = token;
            this.currentUser = JSON.parse(userData);
            this.updateUIForUser();
        }
    }

    getAuthHeaders() {
        if (this.token) {
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            };
        }
        return { 'Content-Type': 'application/json' };
    }

    updateUIForUser() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            userInfo.style.display = 'block';
            userInfo.innerHTML = `
                <span style="cursor: pointer;" onclick="app.openProfileModal()">
                    ${this.currentUser.avatar || '👤'} ${this.currentUser.username} (${this.currentUser.role})
                </span>
            `;

            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
            });

            document.querySelectorAll('.gameadder-only').forEach(el => {
                el.style.display = ['admin', 'gameadder'].includes(this.currentUser.role) ? 'block' : 'none';
            });
        } else {
            loginBtn.style.display = 'block';
            registerBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            userInfo.style.display = 'none';

            document.querySelectorAll('.admin-only, .gameadder-only').forEach(el => {
                el.style.display = 'none';
            });
        }

        this.checkMaintenance();
        this.showAnnouncement();
    }

    checkMaintenance() {
        const maintenance = JSON.parse(localStorage.getItem('maintenance') || '{"enabled":false,"message":""}');
        const banner = document.getElementById('maintenance-banner');
        const text = document.getElementById('maintenance-text');

        if (maintenance.enabled && (!this.currentUser || this.currentUser.role !== 'admin')) {
            banner.style.display = 'block';
            text.textContent = maintenance.message || 'Site is under maintenance';
        } else {
            banner.style.display = 'none';
        }
    }

    showAnnouncement() {
        const announcement = localStorage.getItem('announcement');
        const banner = document.getElementById('announcement-banner');
        const text = document.getElementById('announcement-text');

        if (announcement) {
            banner.style.display = 'block';
            text.textContent = announcement;
        }
    }

    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => this.openModal('login-modal'));
        document.getElementById('register-btn').addEventListener('click', () => this.openModal('register-modal'));
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.classList.remove('active');
                
                if (modal.id === 'game-modal' && window.location.pathname.includes('game-list.html')) {
                    const gamesPageMain = document.querySelector('.games-page-main');
                    if (gamesPageMain) gamesPageMain.style.display = 'block';
                }
            });
        });

        const closeBtn = document.getElementById('close-announcement');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('announcement-banner').style.display = 'none';
            });
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                if (page) {
                    e.preventDefault();
                    this.navigateTo(page);
                }
            });
        });

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        
        const addGameForm = document.getElementById('add-game-form');
        if (addGameForm) {
            addGameForm.addEventListener('submit', (e) => this.handleAddGame(e));
        }

        const requestForm = document.getElementById('request-form');
        if (requestForm) {
            requestForm.addEventListener('submit', (e) => this.handleRequest(e));
        }

        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAdminTab(e.target.dataset.tab));
        });

        const saveAnnouncementBtn = document.getElementById('save-announcement');
        if (saveAnnouncementBtn) {
            saveAnnouncementBtn.addEventListener('click', () => this.saveAnnouncement());
        }

        const clearAnnouncementBtn = document.getElementById('clear-announcement');
        if (clearAnnouncementBtn) {
            clearAnnouncementBtn.addEventListener('click', () => this.clearAnnouncement());
        }

        const saveMaintenanceBtn = document.getElementById('save-maintenance');
        if (saveMaintenanceBtn) {
            saveMaintenanceBtn.addEventListener('click', () => this.saveMaintenance());
        }

        const searchGames = document.getElementById('search-games');
        if (searchGames) {
            searchGames.addEventListener('input', (e) => this.searchGames(e.target.value));
            searchGames.addEventListener('click', (e) => e.stopPropagation());
        }

        const filterGenre = document.getElementById('filter-genre');
        if (filterGenre) {
            filterGenre.addEventListener('change', (e) => this.filterGames(e.target.value));
            filterGenre.addEventListener('click', (e) => e.stopPropagation());
        }

        // Chat system event listeners
        const newThreadBtn = document.getElementById('new-thread-btn');
        if (newThreadBtn) {
            newThreadBtn.addEventListener('click', () => this.openModal('new-thread-modal'));
        }

        const newThreadForm = document.getElementById('new-thread-form');
        if (newThreadForm) {
            newThreadForm.addEventListener('submit', (e) => this.handleCreateThread(e));
        }

        const backToThreadsBtn = document.getElementById('back-to-threads');
        if (backToThreadsBtn) {
            backToThreadsBtn.addEventListener('click', () => this.navigateTo('chat'));
        }

        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        }

        const threadSearch = document.getElementById('thread-search');
        if (threadSearch) {
            threadSearch.addEventListener('input', (e) => this.searchThreads(e.target.value));
        }
    }

    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.token = data.token;
                localStorage.setItem('current_user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                document.getElementById('login-modal').classList.remove('active');
                this.updateUIForUser();
                await this.renderPage();
                alert('Login successful!');
            } else {
                alert(data.error || 'Invalid credentials!');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (password !== confirm) {
            alert('Passwords do not match!');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.token = data.token;
                localStorage.setItem('current_user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);
                document.getElementById('register-modal').classList.remove('active');
                this.updateUIForUser();
                alert('Registration successful!');
                document.getElementById('register-form').reset();
            } else {
                alert(data.error || 'Registration failed!');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed. Please try again.');
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('current_user');
        localStorage.removeItem('token');
        this.updateUIForUser();
        this.navigateTo('home');
        alert('Logged out successfully!');
    }

    navigateTo(page) {
        this.currentPage = page;
        
        const landingPage = document.querySelector('.landing-page');
        if (landingPage) landingPage.style.display = 'none';
        
        const gamesPageMain = document.querySelector('.games-page-main');
        if (gamesPageMain) gamesPageMain.style.display = 'none';
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            const navLink = document.querySelector(`[data-page="${page}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
            this.renderPage();
        }
    }

    async renderPage() {
        const gamesGrid = document.getElementById('games-grid');
        if (gamesGrid) {
            const games = await this.fetchGames();
            this.renderGameGrid(games, 'games-grid');
            this.populateGenreFilter(games);
        }

        const requestsPage = document.getElementById('requests-page');
        if (requestsPage && requestsPage.classList.contains('active')) {
            await this.renderRequestsPage();
        }

        const adminPage = document.getElementById('admin-page');
        if (adminPage && adminPage.classList.contains('active')) {
            await this.renderAdminPage();
        }

        const chatPage = document.getElementById('chat-page');
        if (chatPage && chatPage.classList.contains('active')) {
            await this.renderChatPage();
        }
    }

    async fetchGames() {
        try {
            const response = await fetch('/api/games');
            return await response.json();
        } catch (error) {
            console.error('Fetch games error:', error);
            return [];
        }
    }

    renderGameGrid(games, containerId) {
        const container = document.getElementById(containerId);
        
        if (!games || games.length === 0) {
            container.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No games available yet.</p>';
            return;
        }

        container.innerHTML = games.map(game => `
            <div class="game-card" data-game-id="${game.id}">
                <img src="${game.image}" alt="${game.title}" class="game-image" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="game-content">
                    <h3 class="game-title">${game.title}</h3>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = parseInt(card.dataset.gameId);
                this.showGameDetail(gameId);
            });
        });
    }

    populateGenreFilter(games) {
        if (!games) return;
        const genres = [...new Set(games.map(g => g.genre).filter(g => g))];
        const select = document.getElementById('filter-genre');
        
        if (select) {
            select.innerHTML = '<option value="">All Genres</option>' + 
                genres.map(g => `<option value="${g}">${g}</option>`).join('');
        }
    }

    async searchGames(query) {
        const games = await this.fetchGames();
        const filtered = games.filter(g => 
            g.title.toLowerCase().includes(query.toLowerCase()) ||
            g.short_description.toLowerCase().includes(query.toLowerCase())
        );
        this.renderGameGrid(filtered, 'games-grid');
    }

    async filterGames(genre) {
        const games = await this.fetchGames();
        const filtered = genre ? games.filter(g => g.genre === genre) : games;
        this.renderGameGrid(filtered, 'games-grid');
    }

    async showGameDetail(gameId) {
        const games = await this.fetchGames();
        const game = games.find(g => g.id === gameId);
        this.currentGameId = gameId;

        if (!game) return;

        const gamesPageMain = document.querySelector('.games-page-main');
        if (gamesPageMain && window.location.pathname.includes('game-list.html')) {
            gamesPageMain.style.display = 'none';
        }

        const modal = document.getElementById('game-modal');
        const detail = document.getElementById('game-detail');

        const isFavorite = this.currentUser ? await this.checkFavorite(gameId) : false;

        detail.innerHTML = `
            <div class="game-detail-header">
                <img src="${game.image}" alt="${game.title}" class="game-detail-image" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                <div class="game-detail-info">
                    <h2>${game.title}</h2>
                    <div class="game-detail-meta">
                        <span class="meta-item">⭐ ${game.rating || 'N/A'}</span>
                        <span class="meta-item">🎮 ${game.genre}</span>
                    </div>
                    <div style="margin-top: 20px;">
                        <a href="${game.download_link}" target="_blank" class="btn btn-primary btn-lg">Download Game</a>
                    </div>
                    ${this.currentUser && this.currentUser.role === 'admin' ? `
                        <div style="margin-top: 10px;">
                            <button class="btn btn-danger btn-sm" onclick="app.deleteGame(${game.id})">Delete Game</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    async checkFavorite(gameId) {
        if (!this.currentUser) return false;
        try {
            const response = await fetch(`/api/favorites/${this.currentUser.id}`, {
                headers: this.getAuthHeaders()
            });
            const favorites = await response.json();
            return favorites.some(f => f.id === gameId);
        } catch (error) {
            console.error('Check favorite error:', error);
            return false;
        }
    }

    async toggleFavorite(gameId) {
        if (!this.currentUser) return;
        
        const isFavorite = await this.checkFavorite(gameId);
        
        try {
            if (isFavorite) {
                await fetch(`/api/favorites/${this.currentUser.id}/${gameId}`, { 
                    method: 'DELETE',
                    headers: this.getAuthHeaders()
                });
                alert('Removed from favorites!');
            } else {
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ gameId })
                });
                alert('Added to favorites!');
            }
            await this.showGameDetail(gameId);
        } catch (error) {
            console.error('Toggle favorite error:', error);
            alert('Failed to update favorites');
        }
    }

    async renderComments(gameId) {
        try {
            const response = await fetch(`/api/comments?gameId=${gameId}`);
            const comments = await response.json();
            const container = document.getElementById('comments-list');

            if (comments.length === 0) {
                container.innerHTML = '<p style="color: #64748b; margin-top: 1rem;">No comments yet.</p>';
                return;
            }

            container.innerHTML = comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <div>
                            <span class="comment-author">${comment.author}</span>
                            <span class="role-badge badge-${comment.role}">${comment.role}</span>
                        </div>
                        <small style="color: #64748b;">${new Date(comment.timestamp).toLocaleString()}</small>
                    </div>
                    <p>${comment.text}</p>
                    <div class="comment-actions">
                        <button class="comment-action" onclick="app.toggleLike(${comment.id})">
                            ${comment.likes?.includes(this.currentUser?.username) ? '❤️ Unlike' : '🤍 Like'}
                        </button>
                        <span class="comment-likes">${comment.likes?.length || 0} likes</span>
                        ${this.currentUser && (this.currentUser.username === comment.author || this.currentUser.role === 'admin') ? `
                            <button class="comment-action" onclick="app.deleteComment(${comment.id})">🗑️ Delete</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Render comments error:', error);
        }
    }

    async addComment(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const text = document.getElementById('comment-text').value;

        try {
            await fetch('/api/comments', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    gameId: this.currentGameId,
                    text
                })
            });
            
            document.getElementById('comment-text').value = '';
            await this.renderComments(this.currentGameId);
            await this.updateStats();
        } catch (error) {
            console.error('Add comment error:', error);
            alert('Failed to add comment');
        }
    }

    async toggleLike(commentId) {
        if (!this.currentUser) return;

        try {
            await fetch(`/api/comments/${commentId}/like`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            await this.renderComments(this.currentGameId);
        } catch (error) {
            console.error('Toggle like error:', error);
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Delete this comment?')) return;

        try {
            await fetch(`/api/comments/${commentId}`, { 
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            await this.renderComments(this.currentGameId);
            await this.updateStats();
        } catch (error) {
            console.error('Delete comment error:', error);
            alert('Failed to delete comment');
        }
    }

    async renderRatings(gameId) {
        try {
            const response = await fetch(`/api/ratings/${gameId}`);
            const ratings = await response.json();
            const container = document.getElementById('ratings-list');

            if (ratings.length === 0) {
                container.innerHTML = '<p style="color: #64748b; margin-top: 1rem;">No ratings yet. Be the first to rate!</p>';
                return;
            }

            const avgRating = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
            
            container.innerHTML = `
                <div style="margin: 1rem 0; padding: 1rem; background: #1a1a1a; border-radius: 8px;">
                    <h4 style="color: #ff6b35;">Average Rating: ${avgRating}/10 ⭐ (${ratings.length} ${ratings.length === 1 ? 'rating' : 'ratings'})</h4>
                </div>
                ${ratings.map(rating => `
                    <div class="rating-item" style="padding: 1rem; margin: 0.5rem 0; background: #1a1a1a; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <div>
                                <span style="color: white; font-weight: bold;">${rating.username}</span>
                                <span style="color: #ff6b35; margin-left: 10px; font-size: 1.2em;">${rating.rating}/10 ⭐</span>
                            </div>
                            <small style="color: #64748b;">${new Date(rating.created_at).toLocaleDateString()}</small>
                        </div>
                        ${rating.review ? `<p style="color: #ccc;">${rating.review}</p>` : ''}
                    </div>
                `).join('')}
            `;
        } catch (error) {
            console.error('Render ratings error:', error);
        }
    }

    async submitRating(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const rating = parseInt(document.getElementById('rating-score').value);
        const review = document.getElementById('rating-review').value;

        try {
            await fetch('/api/ratings', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    gameId: this.currentGameId,
                    rating,
                    review
                })
            });
            
            document.getElementById('rating-score').value = '';
            document.getElementById('rating-review').value = '';
            await this.renderRatings(this.currentGameId);
            alert('Rating submitted successfully!');
        } catch (error) {
            console.error('Submit rating error:', error);
            alert('Failed to submit rating');
        }
    }

    async handleAddGame(e) {
        e.preventDefault();

        const game = {
            title: document.getElementById('game-title').value,
            developer: document.getElementById('game-developer').value,
            publisher: document.getElementById('game-developer').value,
            releaseDate: new Date().toISOString().split('T')[0],
            shortDescription: document.getElementById('game-title').value,
            fullDescription: document.getElementById('game-title').value,
            genre: document.getElementById('game-genre').value,
            tags: '',
            rating: document.getElementById('game-rating').value,
            difficulty: 'Easy',
            image: document.getElementById('game-image').value,
            downloadLink: document.getElementById('game-download').value,
            fileSize: 'Unknown',
            requirements: '',
            notes: '',
            addedBy: this.currentUser.username,
            timestamp: new Date().toISOString()
        };

        try {
            await fetch('/api/games', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(game)
            });

            alert('Game added successfully!');
            document.getElementById('add-game-form').reset();
            await this.updateStats();
        } catch (error) {
            console.error('Add game error:', error);
            alert('Failed to add game');
        }
    }

    async deleteGame(gameId) {
        if (!confirm('Delete this game? This will also delete all comments.')) return;

        try {
            await fetch(`/api/games/${gameId}`, { 
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            document.getElementById('game-modal').classList.remove('active');
            await this.renderPage();
            await this.updateStats();
            alert('Game deleted!');
        } catch (error) {
            console.error('Delete game error:', error);
            alert('Failed to delete game');
        }
    }

    async handleRequest(e) {
        e.preventDefault();
        if (!this.currentUser) {
            alert('Please login to submit requests!');
            return;
        }

        const request = {
            steamId: document.getElementById('request-steam-id').value,
            gameName: document.getElementById('request-game-name').value,
            notes: document.getElementById('request-notes').value
        };

        try {
            await fetch('/api/requests', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(request)
            });

            alert('Request submitted!');
            document.getElementById('request-form').reset();
            await this.renderRequestsPage();
        } catch (error) {
            console.error('Submit request error:', error);
            alert('Failed to submit request');
        }
    }

    async renderRequestsPage() {
        if (!this.currentUser) {
            document.getElementById('user-requests').innerHTML = '<p>Please login to view your requests.</p>';
            return;
        }

        try {
            const response = await fetch('/api/requests');
            const requests = await response.json();
            const userRequests = requests.filter(r => r.username === this.currentUser.username);
            const container = document.getElementById('user-requests');

            if (userRequests.length === 0) {
                container.innerHTML = '<p>No requests yet.</p>';
                return;
            }

            container.innerHTML = userRequests.map(req => `
                <div class="request-item">
                    <div class="request-header">
                        <div>
                            <h4>${req.game_name}</h4>
                            <p>Steam ID: ${req.steam_id}</p>
                            ${req.notes ? `<p>${req.notes}</p>` : ''}
                        </div>
                        <span class="request-status status-${req.status}">${req.status.toUpperCase()}</span>
                    </div>
                    <small style="color: #64748b;">Submitted: ${new Date(req.timestamp).toLocaleString()}</small>
                </div>
            `).join('');
        } catch (error) {
            console.error('Render requests error:', error);
        }
    }

    async renderAdminPage() {
        await this.renderAdminUsers();
        await this.renderAdminGames();
        await this.renderAdminRequests();
        this.loadAdminSettings();
    }

    switchAdminTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`admin-${tab}`).classList.add('active');
    }

    async renderAdminUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: this.getAuthHeaders()
            });
            const users = await response.json();
            const container = document.getElementById('users-table');

            container.innerHTML = users.map(user => `
                <div class="table-row">
                    <div>
                        ${user.avatar || '👤'} ${user.username}
                    </div>
                    <div><span class="role-badge badge-${user.role}">${user.role}</span></div>
                    <div>ID: ${user.id}</div>
                    <div class="table-actions">
                        <select onchange="app.changeUserRole(${user.id}, this.value)">
                            <option value="basic" ${user.role === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="gameadder" ${user.role === 'gameadder' ? 'selected' : ''}>Gameadder</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteUser(${user.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Render admin users error:', error);
        }
    }

    async changeUserRole(userId, newRole) {
        try {
            await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ role: newRole })
            });
            alert('Role updated!');
        } catch (error) {
            console.error('Change role error:', error);
            alert('Failed to update role');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Delete this user?')) return;

        try {
            await fetch(`/api/users/${userId}`, { 
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            await this.renderAdminUsers();
            await this.updateStats();
            alert('User deleted!');
        } catch (error) {
            console.error('Delete user error:', error);
            alert('Failed to delete user');
        }
    }

    async renderAdminGames() {
        try {
            const games = await this.fetchGames();
            const container = document.getElementById('admin-games-table');

            if (games.length === 0) {
                container.innerHTML = '<p>No games yet.</p>';
                return;
            }

            container.innerHTML = games.map(game => `
                <div class="table-row">
                    <div>${game.title}</div>
                    <div>${game.genre}</div>
                    <div>By: ${game.added_by}</div>
                    <div class="table-actions">
                        <button class="btn btn-danger btn-sm" onclick="app.deleteGameAdmin(${game.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Render admin games error:', error);
        }
    }

    async deleteGameAdmin(gameId) {
        await this.deleteGame(gameId);
        await this.renderAdminGames();
    }

    async renderAdminRequests() {
        try {
            const response = await fetch('/api/requests', {
                headers: this.getAuthHeaders()
            });
            const requests = await response.json();
            const container = document.getElementById('admin-requests-table');

            if (requests.length === 0) {
                container.innerHTML = '<p>No requests yet.</p>';
                return;
            }

            container.innerHTML = requests.map(req => `
                <div class="table-row">
                    <div>
                        <strong>${req.game_name}</strong><br>
                        Steam ID: ${req.steam_id}<br>
                        By: ${req.username}
                    </div>
                    <div><span class="request-status status-${req.status}">${req.status}</span></div>
                    <div>${new Date(req.timestamp).toLocaleDateString()}</div>
                    <div class="table-actions">
                        ${req.status === 'pending' ? `
                            <button class="btn btn-success btn-sm" onclick="app.updateRequestStatus(${req.id}, 'approved')">Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="app.updateRequestStatus(${req.id}, 'rejected')">Reject</button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="app.deleteRequest(${req.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Render admin requests error:', error);
        }
    }

    async updateRequestStatus(requestId, status) {
        try {
            await fetch(`/api/requests/${requestId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            await this.renderAdminRequests();
            alert(`Request ${status}!`);
        } catch (error) {
            console.error('Update request error:', error);
            alert('Failed to update request');
        }
    }

    async deleteRequest(requestId) {
        if (!confirm('Delete this request?')) return;

        try {
            await fetch(`/api/requests/${requestId}`, { 
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            await this.renderAdminRequests();
            alert('Request deleted!');
        } catch (error) {
            console.error('Delete request error:', error);
            alert('Failed to delete request');
        }
    }

    loadAdminSettings() {
        const announcement = localStorage.getItem('announcement') || '';
        document.getElementById('announcement-input').value = announcement;

        const maintenance = JSON.parse(localStorage.getItem('maintenance') || '{"enabled":false,"message":""}');
        document.getElementById('maintenance-toggle').checked = maintenance.enabled;
        document.getElementById('maintenance-message').value = maintenance.message;
    }

    saveAnnouncement() {
        const text = document.getElementById('announcement-input').value;
        localStorage.setItem('announcement', text);
        this.showAnnouncement();
        alert('Announcement saved!');
    }

    clearAnnouncement() {
        localStorage.setItem('announcement', '');
        document.getElementById('announcement-input').value = '';
        document.getElementById('announcement-banner').style.display = 'none';
        alert('Announcement cleared!');
    }

    saveMaintenance() {
        const enabled = document.getElementById('maintenance-toggle').checked;
        const message = document.getElementById('maintenance-message').value;
        
        localStorage.setItem('maintenance', JSON.stringify({ enabled, message }));
        this.checkMaintenance();
        alert('Maintenance settings saved!');
    }

    async updateStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) return;
            
            const stats = await response.json();

            const totalGames = document.getElementById('total-games');
            const totalUsers = document.getElementById('total-users');
            const totalComments = document.getElementById('total-comments');

            if (totalGames) totalGames.textContent = stats.games || 0;
            if (totalUsers) totalUsers.textContent = stats.users || 0;
            if (totalComments) totalComments.textContent = stats.comments || 0;
        } catch (error) {
            console.error('Update stats error:', error);
        }
    }

    openProfileModal() {
        if (!this.currentUser) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'profile-modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <span class="modal-close" onclick="document.getElementById('profile-modal').remove()">&times;</span>
                <h2>Edit Profile</h2>
                
                <div class="profile-preview">
                    ${this.currentUser.banner ? `<div class="profile-banner" style="background-image: url('${this.currentUser.banner}')"></div>` : '<div class="profile-banner-placeholder">No banner set</div>'}
                    <div class="profile-avatar-container">
                        ${this.currentUser.avatarUrl ? `<img src="${this.currentUser.avatarUrl}" class="profile-avatar-img">` : `<div class="profile-avatar-emoji">${this.currentUser.avatar || '👤'}</div>`}
                    </div>
                </div>

                <form id="profile-form" class="form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="profile-avatar">Avatar (emoji)</label>
                            <input type="text" id="profile-avatar" value="${this.currentUser.avatar || ''}" placeholder="👤" maxlength="2">
                        </div>
                        <div class="form-group">
                            <label for="avatar-upload">Or upload avatar image (JPG/PNG)</label>
                            <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/jpg">
                            <button type="button" id="upload-avatar-btn" class="btn btn-secondary btn-sm">Upload Avatar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="banner-upload">Banner Image (JPG/PNG)</label>
                        <input type="file" id="banner-upload" accept="image/jpeg,image/png,image/jpg">
                        <button type="button" id="upload-banner-btn" class="btn btn-secondary btn-sm">Upload Banner</button>
                    </div>

                    <div class="form-group">
                        <label for="profile-bio">Bio</label>
                        <textarea id="profile-bio" rows="3" placeholder="Tell us about yourself...">${this.currentUser.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="profile-theme">Theme</label>
                        <select id="profile-theme">
                            <option value="dark" ${this.currentUser.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${this.currentUser.theme === 'light' ? 'selected' : ''}>Light</option>
                        </select>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">Save Profile</button>
                </form>
                
                <div style="margin-top: 20px;">
                    <h3>Your Favorites</h3>
                    <div id="user-favorites"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('profile-form').addEventListener('submit', (e) => this.handleProfileUpdate(e));
        document.getElementById('upload-avatar-btn').addEventListener('click', () => this.uploadProfileImage('avatar'));
        document.getElementById('upload-banner-btn').addEventListener('click', () => this.uploadProfileImage('banner'));
        this.loadUserFavorites();
    }

    async uploadProfileImage(type) {
        const fileInput = document.getElementById(`${type}-upload`);
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Please select a file first');
            return;
        }

        const formData = new FormData();
        formData.append(type, file);

        try {
            const response = await fetch(`/api/upload/${type}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                if (type === 'avatar') {
                    this.currentUser.avatarUrl = data.url;
                    document.querySelector('.profile-avatar-container').innerHTML = `<img src="${data.url}" class="profile-avatar-img">`;
                } else if (type === 'banner') {
                    this.currentUser.banner = data.url;
                    document.querySelector('.profile-banner-placeholder, .profile-banner').outerHTML = `<div class="profile-banner" style="background-image: url('${data.url}')"></div>`;
                }
                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
            } else {
                alert(data.error || `Failed to upload ${type}`);
            }
        } catch (error) {
            console.error(`Upload ${type} error:`, error);
            alert(`Failed to upload ${type}`);
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        const avatar = document.getElementById('profile-avatar').value;
        const bio = document.getElementById('profile-bio').value;
        const theme = document.getElementById('profile-theme').value;

        try {
            const response = await fetch(`/api/users/${this.currentUser.id}/profile`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    avatar, 
                    bio, 
                    theme,
                    avatarUrl: this.currentUser.avatarUrl,
                    banner: this.currentUser.banner
                })
            });

            const updatedUser = await response.json();
            this.currentUser = updatedUser;
            localStorage.setItem('current_user', JSON.stringify(updatedUser));
            this.updateUIForUser();
            alert('Profile updated!');
            document.getElementById('profile-modal').remove();
        } catch (error) {
            console.error('Profile update error:', error);
            alert('Failed to update profile');
        }
    }

    async loadUserFavorites() {
        if (!this.currentUser) return;
        
        try {
            const response = await fetch(`/api/favorites/${this.currentUser.id}`, {
                headers: this.getAuthHeaders()
            });
            const favorites = await response.json();
            const container = document.getElementById('user-favorites');

            if (favorites.length === 0) {
                container.innerHTML = '<p>No favorites yet.</p>';
                return;
            }

            container.innerHTML = favorites.map(game => `
                <div style="padding: 10px; border-bottom: 1px solid #333;">
                    <strong>${game.title}</strong> (${game.genre})
                </div>
            `).join('');
        } catch (error) {
            console.error('Load favorites error:', error);
        }
    }

    toggleDescription() {
        const fullDesc = document.getElementById('full-description');
        const btn = document.getElementById('expand-desc-btn');
        
        if (fullDesc.style.display === 'none') {
            fullDesc.style.display = 'block';
            btn.textContent = 'Hide Full Description';
        } else {
            fullDesc.style.display = 'none';
            btn.textContent = 'Show Full Description';
        }
    }

    // Chat system methods
    async renderChatPage() {
        await this.loadThreads();
    }

    async loadThreads() {
        try {
            const response = await fetch('/api/threads');
            const threads = await response.json();
            this.renderThreadsList(threads);
        } catch (error) {
            console.error('Load threads error:', error);
        }
    }

    renderThreadsList(threads) {
        const container = document.getElementById('threads-list');
        
        if (!threads || threads.length === 0) {
            container.innerHTML = '<p style="color: #aaa; text-align: center;">No threads yet. Be the first to start a discussion!</p>';
            return;
        }

        container.innerHTML = threads.map(thread => `
            <div class="thread-item" onclick="app.openThread(${thread.id})">
                <div class="thread-header">
                    <h3 class="thread-title">${thread.title}</h3>
                    <div class="thread-meta">
                        <span class="thread-author">
                            <span class="role-badge badge-${thread.author_role}">${thread.author_role}</span>
                            ${thread.author}
                        </span>
                        <span class="thread-time">${new Date(thread.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <p class="thread-content">${thread.content.substring(0, 150)}${thread.content.length > 150 ? '...' : ''}</p>
                <div class="thread-stats">
                    <span>💬 ${thread.message_count || 0} messages</span>
                    <span>🕒 ${new Date(thread.last_activity).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    }

    async handleCreateThread(e) {
        e.preventDefault();
        if (!this.currentUser) {
            alert('Please login to create threads!');
            return;
        }

        const title = document.getElementById('thread-title').value;
        const content = document.getElementById('thread-content').value;

        try {
            const response = await fetch('/api/threads', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ title, content })
            });

            if (response.ok) {
                alert('Thread created successfully!');
                document.getElementById('new-thread-form').reset();
                document.getElementById('new-thread-modal').classList.remove('active');
                await this.loadThreads();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to create thread');
            }
        } catch (error) {
            console.error('Create thread error:', error);
            alert('Failed to create thread');
        }
    }

    async openThread(threadId) {
        this.currentThreadId = threadId;
        await this.loadThreadMessages(threadId);
        
        document.getElementById('chat-page').classList.remove('active');
        document.getElementById('thread-view-page').classList.add('active');
    }

    async loadThreadMessages(threadId) {
        try {
            const [threadsResponse, messagesResponse] = await Promise.all([
                fetch('/api/threads'),
                fetch(`/api/threads/${threadId}/messages`)
            ]);

            const threads = await threadsResponse.json();
            const messages = await messagesResponse.json();
            
            const thread = threads.find(t => t.id === threadId);
            
            this.renderThreadHeader(thread);
            this.renderThreadMessages(messages);
        } catch (error) {
            console.error('Load thread messages error:', error);
        }
    }

    renderThreadHeader(thread) {
        const container = document.getElementById('thread-info');
        container.innerHTML = `
            <div class="thread-detail-header">
                <h1>${thread.title}</h1>
                <div class="thread-detail-meta">
                    <span class="thread-author">
                        <span class="role-badge badge-${thread.author_role}">${thread.author_role}</span>
                        ${thread.author}
                    </span>
                    <span class="thread-time">${new Date(thread.created_at).toLocaleString()}</span>
                </div>
                <p class="thread-original-content">${thread.content}</p>
            </div>
        `;
    }

    renderThreadMessages(messages) {
        const container = document.getElementById('thread-messages');
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<p style="color: #aaa; text-align: center;">No messages yet. Be the first to reply!</p>';
            return;
        }

        container.innerHTML = messages.map(message => `
            <div class="message-item">
                <div class="message-header">
                    <div class="message-author">
                        <span class="role-badge badge-${message.author_role}">${message.author_role}</span>
                        ${message.author}
                    </div>
                    <div class="message-time">${new Date(message.created_at).toLocaleString()}</div>
                </div>
                <div class="message-content">${message.content}</div>
                <div class="message-actions">
                    <button class="message-action" onclick="app.toggleMessageLike(${message.id})">
                        ${message.likes?.includes(this.currentUser?.username) ? '❤️ Unlike' : '🤍 Like'}
                    </button>
                    <span class="message-likes">${message.likes?.length || 0} likes</span>
                    ${this.currentUser && (this.currentUser.username === message.author || this.currentUser.role === 'admin') ? `
                        <button class="message-action" onclick="app.deleteMessage(${message.id})">🗑️ Delete</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    async handleSendMessage(e) {
        e.preventDefault();
        if (!this.currentUser) {
            alert('Please login to send messages!');
            return;
        }

        const content = document.getElementById('message-content').value;

        try {
            const response = await fetch(`/api/threads/${this.currentThreadId}/messages`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                document.getElementById('message-content').value = '';
                await this.loadThreadMessages(this.currentThreadId);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Send message error:', error);
            alert('Failed to send message');
        }
    }

    async toggleMessageLike(messageId) {
        if (!this.currentUser) return;

        try {
            await fetch(`/api/threads/${this.currentThreadId}/messages/${messageId}/like`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            await this.loadThreadMessages(this.currentThreadId);
        } catch (error) {
            console.error('Toggle message like error:', error);
        }
    }

    async deleteMessage(messageId) {
        if (!confirm('Delete this message?')) return;

        try {
            await fetch(`/api/threads/${this.currentThreadId}/messages/${messageId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            await this.loadThreadMessages(this.currentThreadId);
        } catch (error) {
            console.error('Delete message error:', error);
            alert('Failed to delete message');
        }
    }

    searchThreads(query) {
        const threads = document.querySelectorAll('.thread-item');
        threads.forEach(thread => {
            const title = thread.querySelector('.thread-title').textContent.toLowerCase();
            const content = thread.querySelector('.thread-content').textContent.toLowerCase();
            
            if (title.includes(query.toLowerCase()) || content.includes(query.toLowerCase())) {
                thread.style.display = 'block';
            } else {
                thread.style.display = 'none';
            }
        });
    }
}

const app = new SteamtoolsApp();
