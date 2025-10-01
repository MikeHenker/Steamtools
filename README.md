# Steamtools - Gaming Platform

## Overview

Steamtools is a web-based gaming platform designed for sharing and managing Lua scripts and manifest files. The application provides a comprehensive system for game cataloging, user management, community interaction through comments, and administrative controls. Built as a single-page application with multiple HTML files, it uses client-side storage and role-based access control to manage content and user permissions.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (September 30, 2025)

### Database Migration
- Migrated from localStorage to PostgreSQL database
- Set up Node.js Express backend with RESTful API
- Implemented proper authentication with bcrypt and JWT
- All data now persists in database with proper relationships

### Security Enhancements (Critical)
1. **JWT Authentication**: All protected endpoints now require valid JWT tokens
2. **Ownership Verification**: Users can only modify their own data (favorites, ratings, comments, profiles)
3. **Role-Based Authorization**: Admin and gameadder operations properly restricted
4. **Server-Side Identity**: All user identity data derived from JWT tokens, not client input
5. **Environment Variables**: JWT_SECRET moved to environment variable for production security

### New Features Added
1. **Profile Customization**: Users can now customize their profile with avatar (emoji), bio, and theme preference
2. **Favorites System**: Users can mark games as favorites and view them in their profile
3. **User Ratings**: Users can rate games from 1-10 with optional reviews, average ratings displayed
4. **Database-backed Storage**: All data now stored in PostgreSQL instead of localStorage

## System Architecture

### Frontend Architecture

**Technology Stack**
- Pure vanilla JavaScript (no frameworks)
- HTML5 with multiple static pages (index.html, game-list.html)
- CSS3 with custom properties for theming
- Client-side routing handled through JavaScript
- Fetch API for backend communication

**Design Pattern**
- Class-based application structure (SteamtoolsApp)
- Single responsibility principle with separate HTML pages for different views
- Event-driven architecture for user interactions
- Modal-based UI for detailed views and forms
- RESTful API integration

**State Management**
- JWT token-based authentication stored in localStorage
- Current user session data cached in localStorage
- Page-based navigation state tracking
- All persistent data managed via API calls

**Rationale**: Vanilla JavaScript chosen for simplicity. PostgreSQL database provides proper data persistence, relationships, and scalability.

### Backend Architecture

**Technology Stack**
- Node.js with Express framework
- PostgreSQL database (Neon-backed)
- bcryptjs for password hashing
- jsonwebtoken for authentication
- pg (node-postgres) for database connections

**API Endpoints**
- Authentication: `/api/auth/login`, `/api/auth/register`
- Users: `/api/users`, `/api/users/:id/role`, `/api/users/:id/profile`
- Games: `/api/games`, `/api/games/:id`
- Comments: `/api/comments`, `/api/comments/:id`, `/api/comments/:id/like`
- Requests: `/api/requests`, `/api/requests/:id`
- Favorites: `/api/favorites/:userId`, `/api/favorites`
- Ratings: `/api/ratings/:gameId`, `/api/ratings`
- Stats: `/api/stats`

### Data Architecture

**Storage Model**
- Server-side PostgreSQL database
- RESTful API for all data operations
- JWT-based authentication
- Proper foreign key relationships

**Data Entities**
1. **Users**: Authentication credentials, roles (basic/gameadder/admin), user IDs
2. **Games**: Comprehensive metadata including title, descriptions, images, download links, system requirements, verification status
3. **Comments**: User-generated content with like counts, associations to games and users
4. **Requests**: User game requests with Steam IDs and approval status
5. **Announcements**: System-wide messages displayed in banners
6. **Maintenance**: Mode toggle with custom messages

**Pre-seeded Data**: Three admin accounts hardcoded for initial access (jupiter, khaedus, malte)

**Limitations**: LocalStorage has ~5-10MB limits and data is browser-specific. No multi-device sync or server-side validation.

### Authentication & Authorization

**Authentication Method**
- JWT (JSON Web Token) based authentication
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens stored in localStorage and sent via Authorization header
- JWT_SECRET stored as environment variable for production security
- Tokens contain user ID, username, and role claims

**Authorization Model**
- Role-Based Access Control (RBAC) with three tiers:
  - **Basic**: View games, comment, request games, manage own favorites/ratings/profile
  - **Gameadder**: All basic permissions + add new games
  - **Admin**: Full control including user management, request approval, game deletion, view all requests

**Server-Side Authorization Enforcement**
- All protected endpoints require valid JWT token (authenticateToken middleware)
- Role-based operations checked via requireRole middleware
- Ownership verification: Users can only modify their own data
  - Comments: Users can only delete their own (admins can delete any)
  - Favorites: Users can only view/modify their own favorites
  - Ratings: Users can only submit ratings as themselves
  - Requests: Users see only their own requests (admins see all)
  - Profiles: Users can only update their own profile
- All user identity data (userId, username, role) derived from JWT, never from client input

**UI Permission Enforcement**
- Conditional rendering of navigation links based on roles (.admin-only, .gameadder-only classes)
- Client-side permission checks before executing privileged actions
- Authorization headers automatically attached to all authenticated requests

**Security Considerations**: Production-ready with proper password hashing, JWT authentication, ownership verification, and server-side authorization. Ensure JWT_SECRET is set to a strong random value in production environments.

### Feature Modules

**Game Management System**
- Multi-field upload form with extensive metadata capture
- Image upload supporting both drag-and-drop and URL input
- Game library with search and genre filtering
- Expandable card UI with "Show More" descriptions
- Detail modal displaying full game information
- Role-based delete functionality

**Comment System**
- Per-game threaded comments
- Emoji support in comment text
- Like/unlike with persistence
- Edit/delete with ownership validation
- Sort functionality (newest/oldest)
- Visual role badges (admin/gameadder)

**Request System**
- User-submitted game requests with Steam ID
- Admin approval workflow (approve/reject/delete)
- Mandatory external link redirections (online-fix.me, Discord)

**Admin Panel**
- User role management and deletion
- Game moderation and removal
- Request queue management
- Announcement banner with dismissible UI
- Maintenance mode with custom messaging

### UI/UX Architecture

**Visual Theme**
- CSS custom properties for consistent theming
- Minimal flat design with black background (#0a0a0a, #1a1a1a)
- Orange accent color (#ff6b35) for interactive elements
- Clean borders (no shadows or gradients)
- Modern card-based layouts with simple hover effects
- Responsive design principles
- Modal overlays for detailed interactions

**Navigation Structure**
- Static navbar across all pages
- Multi-page architecture (index.html for landing, game-list.html for library)
- Hash-based navigation for certain views (#requests, #admin)
- Breadcrumb-style active state indicators

**Component Patterns**
- Reusable banner components (announcement, maintenance)
- Modal dialogs for forms and detailed views
- Filter/search controls for content discovery
- Role-specific UI element visibility

## External Dependencies

**Browser APIs**
- LocalStorage API for all data persistence
- File API for image drag-and-drop upload
- DOM API for all UI rendering and manipulation

**External Links (Required Redirects)**
- Online-fix.me: https://online-fix.me (for online gaming modifications)
- Discord Community: https://discord.gg/363dDzJFSv

**No External Libraries**: The application is built entirely with native browser capabilities, requiring no npm packages, CDN imports, or third-party JavaScript libraries.

**Asset Requirements**
- User-uploaded game images (stored as base64 or URLs)
- Emoji support relies on system fonts

**Deployment Constraints**
- Static hosting compatible (no server-side processing needed)
- Works entirely in-browser with no build step
- Cross-browser compatibility depends on LocalStorage and modern JavaScript support
