import { HttpClient } from '../utils/httpClient.js';
import { config } from '../config/index.js';

export class WebflowService {
  constructor() {
    this.client = new HttpClient(config.webflow.apiBaseUrl, {
      'Authorization': `Bearer ${config.webflow.token}`,
      'Accept': 'application/json'
    });
  }

  async checkAndCreateWebhook() {
    const { siteId, webhookUrl, formName } = config.webflow;
    const triggerType = 'form_submission';

    try {
      // Получаем список существующих webhook'ов
      const data = await this.client.get(`/sites/${siteId}/webhooks`);

      // Проверяем, существует ли уже нужный webhook
      const existingWebhook = data?.webhooks?.find(webhook =>
        webhook.triggerType === triggerType &&
        webhook.url === webhookUrl &&
        webhook.filter?.name === formName
      );

      if (existingWebhook) {
        console.log('Webhook already exists:', existingWebhook.id);
        return existingWebhook;
      }

      // Создаем новый webhook
      const webhookData = {
        triggerType,
        url: webhookUrl,
        filter: { name: formName }
      };

      const createdWebhook = await this.client.post(`/sites/${siteId}/webhooks`, webhookData);
      console.log('Webhook created:', createdWebhook.id);
      return createdWebhook;

    } catch (error) {
      console.error('Error managing webhook:', error.message);
      throw new Error(`Failed to manage Webflow webhook: ${error.message}`);
    }
  }

  async getWebhooks() {
    try {
      const data = await this.client.get(`/sites/${config.webflow.siteId}/webhooks`);
      return data.webhooks || [];
    } catch (error) {
      console.error('Error fetching webhooks:', error.message);
      throw new Error(`Failed to fetch Webflow webhooks: ${error.message}`);
    }
  }

  async deleteWebhook(webhookId) {
    try {
      await this.client.request(`/sites/${config.webflow.siteId}/webhooks/${webhookId}`, {
        method: 'DELETE'
      });
      console.log('Webhook deleted:', webhookId);
    } catch (error) {
      console.error('Error deleting webhook:', error.message);
      throw new Error(`Failed to delete Webflow webhook: ${error.message}`);
    }
  }
}

export default WebflowService;