import { HubSpotService } from '../services/hubspotService.js';
import { ScoreService } from '../services/scoreService.js';
import { Validator } from '../utils/validator.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class WebhookController {
  constructor(websocketManager) {
    this.hubspotService = new HubSpotService();
    this.scoreService = new ScoreService();
    this.websocketManager = websocketManager;
  }

  processWebhook = asyncHandler(async (req, res) => {
    // Проверяем структуру данных webhook'а
    if (!req.body?.payload?.data) {
      return res.status(400).json({
        error: 'Invalid webhook format',
        message: 'Missing payload.data in webhook body'
      });
    }

    const formData = req.body.payload.data;
    console.log('Processing form data:', JSON.stringify(formData, null, 2));

    try {
      // Санитизируем и валидируем данные
      const sanitizedData = Validator.sanitizeFormData(formData);
      Validator.validateFormData(sanitizedData);

      // Получаем score данные
      const scoreData = await this.scoreService.getScoreWithValidation(sanitizedData);
      console.log('Score data received:', JSON.stringify(scoreData, null, 2));

      // Маппим данные для HubSpot
      const hubspotData = this.hubspotService.mapFormDataToHubSpot(sanitizedData, scoreData);
      console.log('HubSpot data mapped:', JSON.stringify(hubspotData, null, 2));

      // Создаем или обновляем контакт в HubSpot
      const hubspotResponse = await this.hubspotService.upsertContact(
        sanitizedData.leadEmail,
        hubspotData
      );

      console.log('HubSpot response:', JSON.stringify(hubspotResponse, null, 2));

      // Отправляем данные через WebSocket
      this.websocketManager.broadcastScore(scoreData);

      // Возвращаем успешный ответ
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: {
          hubspotContactId: hubspotResponse.id,
          score: scoreData.score,
          self_service: scoreData.self_service,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error processing webhook:', error);
      
      // Пробуем отправить хотя бы базовую информацию через WebSocket
      try {
        this.websocketManager.broadcastScore({ 
          score: 0, 
          self_service: false,
          error: true 
        });
      } catch (wsError) {
        console.error('Failed to send error via WebSocket:', wsError.message);
      }

      throw error; // Позволяем errorHandler обработать ошибку
    }
  });

  // Endpoint для проверки здоровья сервиса
  healthCheck = asyncHandler(async (req, res) => {
    const stats = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      websocket: this.websocketManager.getStats()
    };

    res.status(200).json(stats);
  });

  // Endpoint для получения статистики WebSocket
  getWebSocketStats = asyncHandler(async (req, res) => {
    const stats = this.websocketManager.getStats();
    res.status(200).json(stats);
  });
}

export default WebhookController;