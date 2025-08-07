import { HttpClient } from '../utils/httpClient.js';
import { config } from '../config/index.js';

export class HubSpotService {
  constructor() {
    this.client = new HttpClient(config.hubspot.apiBaseUrl, {
      'Authorization': `Bearer ${config.hubspot.token}`,
      'Accept': 'application/json'
    });
  }

  async findContactByEmail(email) {
    try {
      const searchData = {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['email', 'firstname', 'lastname', 'createdate']
      };

      const data = await this.client.post('/objects/contacts/search', searchData);
      return data.total > 0 ? data.results[0] : null;
    } catch (error) {
      console.error('Error finding contact by email:', error.message);
      throw new Error(`Failed to find contact in HubSpot: ${error.message}`);
    }
  }

  async createContact(properties) {
    try {
      const contactData = { properties: this.sanitizeProperties(properties) };
      const result = await this.client.post('/objects/contacts', contactData);
      console.log('Contact created in HubSpot:', result.id);
      return result;
    } catch (error) {
      console.error('Error creating contact:', error.message);
      throw new Error(`Failed to create contact in HubSpot: ${error.message}`);
    }
  }

  async updateContact(contactId, properties) {
    try {
      const updateData = { properties: this.sanitizeProperties(properties) };
      const result = await this.client.patch(`/objects/contacts/${contactId}`, updateData);
      console.log('Contact updated in HubSpot:', contactId);
      return result;
    } catch (error) {
      console.error('Error updating contact:', error.message);
      throw new Error(`Failed to update contact in HubSpot: ${error.message}`);
    }
  }

  async upsertContact(email, properties) {
    try {
      const existingContact = await this.findContactByEmail(email);
      
      if (existingContact) {
        return await this.updateContact(existingContact.id, properties);
      } else {
        return await this.createContact(properties);
      }
    } catch (error) {
      console.error('Error upserting contact:', error.message);
      throw error;
    }
  }

  mapFormDataToHubSpot(formData, scoreData) {
    return {
      email: formData.leadEmail,
      firstname: formData.leadFirstName || 'NoName',
      company_size: formData.leadTeamSize,
      custom_source: formData.leadSource || 'Website',
      contact_role: formData.leadRole,
      phone: formData.leadPhone || 'NoPhone',
      ga_id: formData.gaCookie || 'NoGAID',
      country: formData.leadCountry,
      utm_campaign: formData.utm_campaign || 'NoCampaign',
      utm_content: formData.utm_content || 'NoContent',
      utm_medium: formData.utm_medium || 'NoMedium',
      utm_source: formData.utm_source || 'NoSource',
      utm_term: formData.utm_term || 'NoTerm',
      referral_code: formData.referralCode,
      custom_language: formData.hsLang,
      lead_tags: formData.formName,
      custom_score: scoreData?.score,
      affiliate_code: formData.affiliateAid,
      lead_tags_details: formData.demoSource,
    };
  }

  sanitizeProperties(properties) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(properties)) {
      // Пропускаем null, undefined и пустые строки
      if (value !== null && value !== undefined && value !== '') {
        // Конвертируем все значения в строки для HubSpot
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }
}

export default HubSpotService;