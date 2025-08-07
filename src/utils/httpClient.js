import fetch from 'node-fetch';
import { config } from '../config/index.js';

export class HttpClient {
  constructor(baseURL, defaultHeaders = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const requestOptions = {
      timeout: config.performance.requestTimeout,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    let lastError;
    
    for (let attempt = 1; attempt <= config.performance.retryAttempts; attempt++) {
      try {
        const response = await fetch(fullUrl, requestOptions);
        
        if (!response.ok) {
          throw new HttpError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText
          );
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt === config.performance.retryAttempts) {
          break;
        }
        
        // Ждем перед повторной попыткой
        await this.delay(config.performance.retryDelay * attempt);
      }
    }
    
    throw lastError;
  }

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class HttpError extends Error {
  constructor(message, status, statusText) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
  }
}

export default HttpClient;