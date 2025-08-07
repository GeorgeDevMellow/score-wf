import { HttpClient } from '../utils/httpClient.js';
import { config } from '../config/index.js';

export class ScoreService {
  constructor() {
    this.client = new HttpClient(config.scoreApi.baseUrl);
  }

  async getScore(formData) {
    try {
      const scoreData = {
        data: {
          email: formData.leadEmail,
          name: formData.leadFirstName || 'empty name',
          role: formData.leadRole,
          team_size: formData.leadTeamSize,
          country: formData.leadCountry,
        }
      };

      console.log('Requesting score for:', scoreData.data);
      
      const result = await this.client.post(config.scoreApi.processEndpoint, scoreData);
      
      console.log('Score API response:', result);
      
      // Валидируем ответ
      if (!result.score && result.score !== 0) {
        throw new Error('Invalid response from Score API: missing score field');
      }

      return {
        score: result.score,
        self_service: result.self_service || false,
        metadata: result.metadata || {}
      };
      
    } catch (error) {
      console.error('Error getting score:', error.message);
      
      // В случае ошибки возвращаем дефолтные значения
      console.warn('Using default score values due to API error');
      return {
        score: 0,
        self_service: false,
        metadata: { error: error.message }
      };
    }
  }

  validateFormDataForScore(formData) {
    const requiredFields = ['leadEmail'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields for score calculation: ${missingFields.join(', ')}`);
    }
  }

  async getScoreWithValidation(formData) {
    this.validateFormDataForScore(formData);
    return await this.getScore(formData);
  }
}

export default ScoreService;