export class MemoryCache {
  constructor(defaultTtl = 300000) { // 5 минут по умолчанию
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTtl = defaultTtl;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  set(key, value, ttl = this.defaultTtl) {
    // Очищаем существующий таймер
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Сохраняем значение
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Устанавливаем таймер для удаления
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
    this.stats.sets++;
    
    console.log(`Cache SET: ${key} (TTL: ${ttl}ms)`);
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      console.log(`Cache MISS: ${key}`);
      return null;
    }

    // Проверяем, не истек ли срок действия
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.delete(key);
      this.stats.misses++;
      console.log(`Cache EXPIRED: ${key}`);
      return null;
    }

    this.stats.hits++;
    console.log(`Cache HIT: ${key}`);
    return item.value;
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    if (deleted) {
      this.stats.deletes++;
      console.log(`Cache DELETE: ${key}`);
    }
    
    return deleted;
  }

  has(key) {
    return this.cache.has(key) && this.get(key) !== null;
  }

  clear() {
    // Очищаем все таймеры
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();
    
    console.log('Cache cleared');
  }

  size() {
    return this.cache.size;
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.size(),
      defaultTtl: this.defaultTtl
    };
  }

  // Метод для кеширования результатов функций
  async memoize(key, fn, ttl = this.defaultTtl) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      console.error(`Error in memoized function for key ${key}:`, error.message);
      throw error;
    }
  }
}

// Создаем глобальный экземпляр кеша
export const globalCache = new MemoryCache();

export default MemoryCache;