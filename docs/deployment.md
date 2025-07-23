# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Node.js v18+ (for local development)
- Domain name (for production)
- SSL certificate (for production)

## Development Deployment

### 1. Clone and Setup
```bash
git clone <repository-url>
cd companion-chatbot
cp env.example .env
```

### 2. Configure Environment Variables
Edit `.env` with your specific values:
```bash
# Required for development
PERPLEXITY_API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure-password
```

### 3. Start Development Environment
```bash
# Start all services
docker-compose -f docker/docker-compose.dev.yml up -d

# Or start without Docker
npm run setup
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- MongoDB: localhost:27017
- Redis: localhost:6379
- Ollama LLM: localhost:11434

## Production Deployment

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSL Certificate Setup
```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### 3. Production Configuration
Create production environment file:
```bash
cp env.example .env.production
```

Update with production values:
```bash
NODE_ENV=production
MONGODB_URI=mongodb://database:27017/companion_prod
CORS_ORIGIN=https://your-domain.com
# ... other production values
```

### 4. Deploy to Production
```bash
# Build and start production containers
docker-compose -f docker/docker-compose.prod.yml up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

## Health Checks

### Application Health
```bash
# Check frontend
curl http://localhost:3000

# Check backend API
curl http://localhost:8080/api/health

# Check database connection
docker exec -it companion-database mongo --eval "db.stats()"
```

### Service Monitoring
```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Logs
docker-compose logs [service-name]
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker exec companion-database mongodump --out /backup/$(date +%Y%m%d_%H%M%S)

# Restore backup
docker exec -i companion-database mongorestore /backup/backup_folder
```

### Full System Backup
```bash
# Stop services
docker-compose down

# Backup volumes
docker run --rm -v companion-chatbot_mongodb_data:/source -v $(pwd)/backups:/backup alpine tar czf /backup/mongodb_$(date +%Y%m%d).tar.gz -C /source .

# Restart services
docker-compose up -d
```

## Scaling and Optimization

### Database Optimization
- Index frequently queried fields
- Implement connection pooling
- Regular database maintenance

### Application Optimization
- Enable response compression
- Implement caching strategies
- Monitor memory usage

### Load Balancing
For high-traffic scenarios, consider:
- Multiple backend instances
- Redis session store
- CDN for static assets

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose logs [service-name]

# Check configuration
docker-compose config

# Rebuild containers
docker-compose build --no-cache
```

**Database connection issues:**
```bash
# Check MongoDB status
docker exec companion-database mongo --eval "db.runCommand({connectionStatus: 1})"

# Reset database
docker-compose down -v
docker-compose up -d
```

**Performance issues:**
```bash
# Monitor resource usage
docker stats

# Check application logs
docker-compose logs backend

# Review slow query logs
```

## Security Considerations

- Use strong JWT secrets
- Implement rate limiting
- Regular security updates
- Monitor access logs
- Use HTTPS in production
- Secure API endpoints
- Validate all inputs 