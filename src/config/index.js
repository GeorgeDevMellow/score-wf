import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'WEBFLOW_TOKEN',
  'HUBSPOT_TOKEN',
  'SITE_ID',
  'WEBHOOK_URL',
  'FORM_NAME'
];

// Проверяем наличие всех обязательных переменных окружения
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Webflow configuration
  webflow: {
    token: process.env.WEBFLOW_TOKEN,
    siteId: process.env.SITE_ID,
    webhookUrl: process.env.WEBHOOK_URL,
    formName: process.env.FORM_NAME,
    apiBaseUrl: 'https://api.webflow.com/v2'
  },
  
  // HubSpot configuration
  hubspot: {
    token: process.env.HUBSPOT_TOKEN,
    apiBaseUrl: 'https://api.hubapi.com/crm/v3'
  },
  
  // Score API configuration
  scoreApi: {
    baseUrl: 'https://api2.usemellow.com',
    processEndpoint: '/process'
  },
  
  // WebSocket configuration
  websocket: {
    heartbeatInterval: 30000, // 30 seconds
    maxConnections: 1000
  },
  
  // Performance settings
  performance: {
    requestTimeout: 10000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  }
};

export default config;