# ChartGenie 🎨

**Conversational Diagram Generation with AI**

ChartGenie is a full-stack application that transforms natural language descriptions into beautiful diagrams using AI. Simply describe what you want to visualize, and ChartGenie will generate Mermaid diagrams through conversational interactions.

![ChartGenie Demo](https://via.placeholder.com/800x400/1f2937/ffffff?text=ChartGenie+Demo)

## ✨ Features

### 🤖 AI-Powered Generation
- **Natural Language Processing**: Describe diagrams in plain English
- **Conversational Interface**: Iterative refinement through chat
- **Multiple Diagram Types**: ER diagrams, flowcharts, sequence diagrams, class diagrams
- **Smart Context Awareness**: Remembers previous diagrams in conversation

### 🔄 Interactive Modifications
- **Real-time Editing**: Modify existing diagrams conversationally
- **Entity Preservation**: Intelligent validation to maintain diagram integrity
- **Undo/Redo Support**: Track changes throughout the conversation
- **Session Persistence**: Continue conversations across browser sessions

### 🚀 Performance & Reliability
- **Intelligent Caching**: Fast responses for similar requests
- **Fallback Generation**: Template-based backups when AI is unavailable
- **Error Recovery**: Graceful handling of API failures
- **Session Management**: Automatic cleanup of old conversations

### 🎨 Modern UI/UX
- **Responsive Design**: Built with Next.js and Tailwind CSS
- **Real-time Preview**: Live diagram rendering as you chat
- **Dark/Light Mode**: Customizable theme preferences
- **Export Options**: Download diagrams in multiple formats

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Service    │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Groq API)    │
│   + Tailwind    │    │   + NodeCache   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Groq API key (free at [console.groq.com](https://console.groq.com/keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chartgenie.git
   cd chartgenie
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**
   
   Create `backend/.env`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3001
   NODE_ENV=development
   ```

5. **Start the development servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 🎯 Usage Examples

### Create a Database Schema
```
"Create an ER diagram for a blog system with users, posts, and comments"
```

### Generate a Process Flow
```
"Show me a flowchart for user authentication process"
```

### Modify Existing Diagrams
```
"Add a 'categories' table to the blog schema and connect it to posts"
```

### Create System Architecture
```
"Design a sequence diagram showing how a user logs in to the system"
```

## 🛠️ Project Structure

```
chartgenie/
├── backend/                 # Express.js API server
│   ├── server.js           # Main server file
│   ├── config/             # Configuration files
│   ├── utils/              # Utility functions
│   ├── services/           # External service integrations
│   └── package.json
├── frontend/               # Next.js application
│   ├── pages/              # Next.js pages
│   ├── components/         # React components
│   ├── styles/             # Tailwind CSS styles
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Frontend utilities
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Backend Configuration (`backend/config/index.js`)

```javascript
module.exports = {
  OUTPUT_FORMATS: {
    MERMAID: 'mermaid',
    PLANTUML: 'plantuml',
    TIKZ: 'tikz'
  },
  CONFIG: {
    CACHE_TTL: 3600,           // Cache time-to-live (seconds)
    MAX_HISTORY_LENGTH: 10,    // Max conversation history
    GROQ_MODEL: 'mixtral-8x7b-32768'
  }
};
```

### Frontend Configuration (`frontend/next.config.js`)

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ];
  }
};
```

## 📡 API Reference

### Core Endpoints

#### Generate Diagram
```http
POST /api/diagram
Content-Type: application/json

{
  "message": "Create a user registration flowchart",
  "format": "mermaid",
  "sessionId": "optional-session-id",
  "currentDiagram": "optional-current-diagram"
}
```

#### Health Check
```http
GET /api/ping
```

#### Session Management
```http
GET /api/session/:sessionId      # Get session details
DELETE /api/session/:sessionId   # Delete session
GET /api/sessions               # List all sessions
```

#### Cache Management
```http
GET /api/cache-stats            # View cache statistics
POST /api/cache/clear           # Clear cache
```

## 🎨 Frontend Components

### Key React Components

- **`ChatInterface`** - Main conversational UI
- **`DiagramViewer`** - Mermaid diagram renderer
- **`SessionManager`** - Handle conversation sessions
- **`ExportDialog`** - Diagram export functionality
- **`ThemeToggle`** - Dark/light mode switcher

### Tailwind Utilities

The frontend uses Tailwind CSS for styling with custom configurations:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out'
      }
    }
  }
};
```

## 🔄 State Management

### Backend Session State
- **Conversation History**: Stored in-memory Map
- **Current Diagram**: Maintained per session
- **Cache Layer**: NodeCache for response caching

### Frontend State
- **React State**: Component-level state with hooks
- **Session Storage**: Browser session persistence
- **Context API**: Global theme and user preferences

## 🚀 Deployment

### Backend (Express.js)

**Option 1: Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

**Option 2: Heroku**
```bash
# Install Heroku CLI
npm install -g heroku

# Deploy
heroku create chartgenie-api
git push heroku main
```

### Frontend (Next.js)

**Option 1: Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Option 2: Netlify**
```bash
# Build and deploy
npm run build
npm run export
# Upload dist/ folder to Netlify
```

### Environment Variables for Production

Backend:
```env
GROQ_API_KEY=your_production_groq_key
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

Frontend:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:3001/api/ping

# Test diagram generation
curl -X POST http://localhost:3001/api/diagram \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a simple user entity", "format": "mermaid"}'
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow ESLint configuration
- Use conventional commit messages
- Add tests for new features
- Update documentation
- Ensure responsive design

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** - Fast AI inference
- **Mermaid** - Diagram generation library
- **Next.js** - React framework
- **Tailwind CSS** - Utility-first CSS framework
- **Express.js** - Node.js web framework

## 🐛 Troubleshooting

### Common Issues

**Issue**: "No Groq API key configured"
**Solution**: Ensure `GROQ_API_KEY` is set in `backend/.env`

**Issue**: Frontend can't connect to backend
**Solution**: Check that backend is running on port 3001 and frontend proxy is configured

**Issue**: Diagrams not rendering
**Solution**: Verify Mermaid syntax is valid and check browser console for errors

**Issue**: Sessions not persisting
**Solution**: Check browser storage permissions and backend memory limits

### Debug Mode

Enable debug logging:
```bash
# Backend
DEBUG=chartgenie:* npm run dev

# Frontend  
NEXT_PUBLIC_DEBUG=true npm run dev
```

## 📊 Performance

### Optimization Features

- **Response Caching**: 3600s TTL for similar requests
- **Session Cleanup**: Automatic removal of old sessions
- **Code Splitting**: Next.js automatic optimization
- **Image Optimization**: Next.js built-in image optimization
- **Bundle Analysis**: Webpack bundle analyzer integration

### Monitoring

- Server health: `/api/ping`
- Cache statistics: `/api/cache-stats`
- Active sessions: `/api/sessions`

---

**Happy Diagramming! 🎨**

For questions or support, please [open an issue](https://github.com/yourusername/chartgenie/issues) or contact the maintainers.
