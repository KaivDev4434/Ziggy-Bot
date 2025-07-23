# Companion Chatbot - Ziggy Bot

A browser-based companion chatbot focused on intelligent task management with natural language processing capabilities.

## 🚀 Features

- **Intelligent Task Management**: Natural language task creation and prioritization
- **Hybrid AI Architecture**: Combines Perplexity Pro API with local LLM deployment
- **Morning Greetings**: Personalized daily planning and task overview
- **Progressive Web App**: Mobile-first responsive design with offline capabilities
- **Docker Containerization**: Easy deployment and development setup

## 🏗️ Architecture

```
companion-chatbot/
├── frontend/          # React/Next.js application
├── backend/           # Node.js/Express API server
├── shared/            # Shared utilities and types
├── docker/            # Docker configuration files
├── docs/              # Project documentation
├── tests/             # Integration and E2E tests
└── scripts/           # Deployment and utility scripts
```

## 🛠️ Technology Stack

- **Frontend**: React with Next.js, Material-UI/Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: MongoDB with Redis caching
- **AI Integration**: Perplexity Pro API + Local LLM (Ollama)
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest, Cypress, React Testing Library

## 📋 Prerequisites

- Node.js v18+
- Docker Desktop
- MongoDB Community Edition
- Redis
- Git

## 🚦 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd companion-chatbot
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Install Dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd ../backend && npm install
   ```

4. **Start Development Environment**
   ```bash
   # From project root
   docker-compose up -d
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - MongoDB: localhost:27017
   - Redis: localhost:6379

## 🧪 Testing

```bash
# Run all tests
npm run test

# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# End-to-end tests
npm run test:e2e
```

## 📚 Documentation

- [Project Plan](./Browser-Based%20Companion%20Chatbot%20Project%20Plan.md)
- [Detailed Action Plan](./Ziggy%20Bot%20action%20plan.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Development Workflow

1. Create feature branches from `develop`
2. Follow conventional commit messages
3. Ensure all tests pass
4. Create pull request to `develop`
5. Code review and merge

## 📝 Phase Implementation Status

- [x] **Phase 1**: Project Foundation and Environment Setup
- [ ] **Phase 2**: Database Design and Core Backend Development
- [ ] **Phase 3**: Frontend Development and User Interface
- [ ] **Phase 4**: AI Integration and Intelligence Features
- [ ] **Phase 5**: Advanced Features and Optimization
- [ ] **Phase 6**: Comprehensive Testing and Quality Assurance
- [ ] **Phase 7**: Deployment and Production Setup
- [ ] **Phase 8**: Go-Live and Post-Launch Support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

*Kaivalya Dixit* 