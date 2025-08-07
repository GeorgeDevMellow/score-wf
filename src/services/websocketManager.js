import { WebSocketServer } from 'ws';
import { config } from '../config/index.js';

export class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ 
      server,
      maxPayload: 16 * 1024 // 16KB max payload
    });
    this.clients = new Set();
    this.heartbeatInterval = null;
    
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, request) => {
      console.log('New WebSocket client connected from:', request.socket.remoteAddress);
      
      // Проверяем лимит подключений
      if (this.clients.size >= config.websocket.maxConnections) {
        console.warn('Max connections reached, closing new connection');
        ws.close(1013, 'Server overloaded');
        return;
      }

      // Добавляем клиента
      this.clients.add(ws);
      ws.isAlive = true;

      // Обработчик pong для heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Обработчик сообщений от клиента
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid message from client:', error.message);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      // Обработчик закрытия соединения
      ws.on('close', (code, reason) => {
        console.log(`WebSocket client disconnected: ${code} ${reason}`);
        this.clients.delete(ws);
      });

      // Обработчик ошибок
      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        this.clients.delete(ws);
      });

      // Отправляем приветственное сообщение
      this.sendToClient(ws, {
        type: 'connection',
        message: 'Connected successfully',
        timestamp: new Date().toISOString()
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server error:', error.message);
    });
  }

  handleClientMessage(ws, message) {
    console.log('Received message from client:', message);
    
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'subscribe':
        // Можно добавить логику подписки на определенные события
        ws.subscriptions = message.topics || [];
        this.sendToClient(ws, { type: 'subscribed', topics: ws.subscriptions });
        break;
      default:
        this.sendToClient(ws, { type: 'error', message: 'Unknown message type' });
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log('Terminating dead connection');
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, config.websocket.heartbeatInterval);
  }

  sendToClient(ws, data) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message to client:', error.message);
        this.clients.delete(ws);
      }
    }
  }

  broadcast(data, filter = null) {
    const message = JSON.stringify(data);
    let sentCount = 0;

    this.clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        // Применяем фильтр если он задан
        if (filter && !filter(ws)) {
          return;
        }

        try {
          ws.send(message);
          sentCount++;
        } catch (error) {
          console.error('Error broadcasting to client:', error.message);
          this.clients.delete(ws);
        }
      } else {
        // Удаляем закрытые соединения
        this.clients.delete(ws);
      }
    });

    console.log(`Broadcasted message to ${sentCount} clients`);
    return sentCount;
  }

  broadcastScore(scoreData, delay = 2000) {
    setTimeout(() => {
      const message = {
        type: 'score_update',
        data: {
          score: scoreData.score,
          self_service: scoreData.self_service,
          timestamp: new Date().toISOString()
        }
      };

      this.broadcast(message);
    }, delay);
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      maxConnections: config.websocket.maxConnections,
      heartbeatInterval: config.websocket.heartbeatInterval
    };
  }

  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    this.wss.close();
    console.log('WebSocket server closed');
  }
}

export default WebSocketManager;