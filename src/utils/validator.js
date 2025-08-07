export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class Validator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', 'leadEmail');
    }
    return true;
  }

  static validateFormData(formData) {
    const errors = [];

    // Проверяем обязательные поля
    if (!formData.leadEmail) {
      errors.push({ field: 'leadEmail', message: 'Email is required' });
    } else {
      try {
        this.validateEmail(formData.leadEmail);
      } catch (error) {
        errors.push({ field: 'leadEmail', message: error.message });
      }
    }

    if (!formData.leadFirstName || formData.leadFirstName.trim() === '') {
      errors.push({ field: 'leadFirstName', message: 'First name is required' });
    }

    // Проверяем длину полей
    if (formData.leadFirstName && formData.leadFirstName.length > 50) {
      errors.push({ field: 'leadFirstName', message: 'First name is too long (max 50 characters)' });
    }

    if (formData.leadRole && formData.leadRole.length > 100) {
      errors.push({ field: 'leadRole', message: 'Role is too long (max 100 characters)' });
    }

    if (formData.leadCountry && formData.leadCountry.length > 50) {
      errors.push({ field: 'leadCountry', message: 'Country is too long (max 50 characters)' });
    }

    // Проверяем числовые поля
    if (formData.leadTeamSize && (isNaN(formData.leadTeamSize) || formData.leadTeamSize < 0)) {
      errors.push({ field: 'leadTeamSize', message: 'Team size must be a positive number' });
    }

    if (errors.length > 0) {
      const error = new ValidationError('Validation failed');
      error.errors = errors;
      throw error;
    }

    return true;
  }

  static sanitizeFormData(formData) {
    const sanitized = {};
    
    // Очищаем строковые поля от лишних пробелов
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export default Validator;