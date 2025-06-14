This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# ChartGenie Conversational Server

A modular Node.js server for generating database diagrams using conversational AI (Groq API). The server maintains conversation context and can intelligently modify existing diagrams based on user requests.

## 📁 Project Structure

```
├── server.js           # Main Express server and route handlers
├── config.js           # Configuration constants and environment variables
├── groqService.js      # Groq API integration and communication
├── diagramGenerator.js # Core diagram generation logic and conversation handling
├── templates.js        # Fallback diagram templates and patterns
├── trimmer.js          # Diagram code cleaning and validation utilities
├── utils.js            # General utility functions and helpers
├── package.json        # Dependencies and project metadata
└── README.md          # This file
```

## 🏗️ Module Breakdown

### `config.js`
- Environment variable management
- Application constants (ports, timeouts, etc.)
- Output format definitions
- Groq API configuration

### `groqService.js`
- Groq API communication
- Error handling for API calls
- Connection testing utilities

### `diagramGenerator.js`
- Main diagram generation orchestration
- Conversational prompt creation
- Context-aware diagram modification
- Fallback handling when AI fails

### `templates.js`
- Pre-built diagram templates (Hospital, E-commerce, Generic)
- Entity field definitions by type
- Relationship mapping rules
- Template selection logic

### `trimmer.js`
- Raw AI response cleaning
- Diagram code validation
- Structure normalization
- Duplicate removal

### `utils.js`
- Input validation
- Entity extraction and parsing
- Modification intent detection
- Table name extraction
- Relationship building utilities

### `server.js`
- Express app setup and middleware
- Route definitions and handlers
- Session management
- Cache management
- Graceful shutdown handling

## 🚀 Setup and Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3003
   ```

3. **Get Groq API Key:**
   - Visit [https://console.groq.com/keys](https://console.groq.com/keys)
   - Sign up for free
   - Create an API key
   - Add it to your `.env` file

4. **Start the server:**
   ```bash
   # Production
   npm start
   
   # Development (with auto-reload)
   npm run dev
   ```

## 📡 API Endpoints

### Health & Testing
- `GET /api/ping` - Health check and server status
- `GET /api/test-groq` - Test Groq API connection

### Diagram Generation
- `POST /api/diagram` - Generate or modify diagrams
  ```json
  {
    "message": "Create an e-commerce database",
    "format": "mermaid",
    "sessionId": "optional-session-id",
    "currentDiagram": "optional-existing-diagram"
  }
  ```

### Session Management
- `GET /api/conversation/:sessionId` - Get conversation history
- `DELETE /api/conversation/:sessionId` - Clear conversation
- `GET /api/sessions` - List all active sessions

### System
- `GET /api/formats` - List supported output formats
- `DELETE /api/cache` - Clear server cache

## 🔄 Conversational Features

### Context Awareness
- Maintains conversation history per session
- Understands modification requests ("add reviews table")
- Preserves existing entities when modifying diagrams

### Intelligent Modifications
- Detects when user wants to modify vs. create new
- Automatically creates relationships between new and existing entities
- Validates that modifications preserve original structure

### Fallback System
- Uses templates when AI fails
- Smart table generation based on context
- Preserves user intent even when API is unavailable

## 🧪 Example Usage

### Creating a New Diagram
```bash
curl -X POST http://localhost:3003/api/diagram \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a hospital management system",
    "format": "mermaid"
  }'
```

### Modifying Existing Diagram
```bash
curl -X POST http://localhost:3003/api/diagram \
  -H "Content-Type: application/json" \
  -d '{
    "message": "add a pharmacy table",
    "format": "mermaid",
    "sessionId": "existing-session-id",
    "currentDiagram": "erDiagram..."
  }'
```

## 🛠️ Development

### Adding New Templates
1. Add template to `templates.js`
2. Update `getTemplateByKeywords()` function
3. Add field definitions to `TABLE_TYPE_FIELDS`

### Adding New Output Formats
1. Add format to `OUTPUT_FORMATS` in `config.js`
2. Update validation in `utils.js`
3. Add cleaning logic in `trimmer.js`

### Extending Utilities
- Add new utility functions to `utils.js`
- Update validation logic as needed
- Add tests for new functionality

## 🔍 Debugging

### Enable Detailed Logging
The server includes extensive console logging:
- `🔥` - Main operations
- `✅` - Successful operations
- `❌` - Errors
- `⚠️` - Warnings
- `🔍` - Analysis/validation
- `📊` - Data processing

### Common Issues
1. **Missing Groq API Key**: Check `.env` file configuration
2. **Invalid Diagrams**: Check `trimmer.js` validation logic
3. **Session Issues**: Monitor session cleanup in server logs

## 📈 Performance Considerations

- **Caching**: Results are cached with conversation context
- **Session Cleanup**: Old sessions auto-cleanup after 24 hours
- **Memory Management**: History limited to last 10 exchanges per session
- **Context Size**: Only last 3 exchanges used for AI context

## 🔧 Configuration Options

Modify `config.js` to adjust:
- Cache TTL (time-to-live)
- Maximum input length
- Conversation history limits
- Context history size
- Groq API parameters

## 📝 License

MIT License - feel free to use and modify as needed.