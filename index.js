import express from 'express';
import { createServer } from 'http';
import { config } from './src/config/index.js';
import { WebSocketManager } from './src/services/websocketManager.js';
import { WebflowService } from './src/services/webflowService.js';
import { WebhookController } from './src/controllers/webhookController.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { requestLogger, webhookLogger } from './src/middleware/logger.js';
import { globalCache } from './src/utils/cache.js';

class Application {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.websocketManager = null;
    this.webflowService = null;
    this.webhookController = null;
  }

  setupMiddleware() {
    // Trust proxy for Heroku
    this.app.set('trust proxy', 1);
    
    // Basic middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use(requestLogger);
  }

  setupServices() {
    // Initialize WebSocket manager
    this.websocketManager = new WebSocketManager(this.server);
    
    // Initialize Webflow service
    this.webflowService = new WebflowService();
    
    // Initialize webhook controller
    this.webhookController = new WebhookController(this.websocketManager);
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', this.webhookController.healthCheck);
    
    // WebSocket stats endpoint
    this.app.get('/ws-stats', this.webhookController.getWebSocketStats);
    
    // Cache stats endpoint
    this.app.get('/cache-stats', (req, res) => {
      res.json(globalCache.getStats());
    });
    
    // Main webhook endpoint with logging
    this.app.post('/', webhookLogger, this.webhookController.processWebhook);
    
    // Catch all other routes
    this.app.use('*', notFoundHandler);
  }

  setupErrorHandling() {
    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  async initializeWebflow() {
    try {
      console.log('Initializing Webflow webhook...');
      await this.webflowService.checkAndCreateWebhook();
      console.log('Webflow webhook initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Webflow webhook:', error.message);
      // Don't exit, continue running
    }
  }

  setupGracefulShutdown() {
    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
      
      // Close HTTP server
      this.server.close(() => {
        console.log('HTTP server closed');
        
        // Close WebSocket connections
        if (this.websocketManager) {
          this.websocketManager.close();
        }
        
        // Clear cache
        globalCache.clear();
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  async start() {
    try {
      console.log('Starting application...');
      
      // Setup application components
      this.setupMiddleware();
      this.setupServices();
      this.setupRoutes();
      this.setupErrorHandling();
      this.setupGracefulShutdown();
      
      // Initialize external services
      await this.initializeWebflow();
      
      // Start server
      this.server.listen(config.port, () => {
        console.log(`🚀 Server is running on port ${config.port}`);
        console.log(`📊 Environment: ${config.nodeEnv}`);
        console.log(`🔌 WebSocket server ready`);
        console.log(`💾 Cache system initialized`);
        console.log(`📡 Webhook endpoint: POST /`);
        console.log(`🏥 Health check: GET /health`);
        console.log(`📈 WebSocket stats: GET /ws-stats`);
        console.log(`📊 Cache stats: GET /cache-stats`);
      });
      
    } catch (error) {
      console.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}

// Create and start application
const app = new Application();
app.start();

export default app;
