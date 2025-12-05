/**
 * StorageAdapter - 存储适配器
 * 封装微信小游戏的本地存储API，提供统一的存储接口
 * 包含错误处理和日志记录功能
 */
class StorageAdapter {
  constructor() {
    this.logPrefix = '[StorageAdapter]';
  }

  /**
   * 保存数据到本地存储
   * 实现完整的错误处理和验证
   * @param {string} key - 存储键名
   * @param {any} value - 要保存的值（会自动转换为字符串）
   * @returns {boolean} - 保存是否成功
   * 需求: 3.1, 3.3
   */
  setItem(key, value) {
    try {
      // 验证参数
      if (!key) {
        console.error(`${this.logPrefix} setItem failed: key is required`);
        return false;
      }
      
      if (value === undefined) {
        console.error(`${this.logPrefix} setItem failed: value is undefined for key "${key}"`);
        return false;
      }

      // 将值转换为字符串存储
      let stringValue;
      try {
        stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      } catch (stringifyError) {
        console.error(`${this.logPrefix} Failed to stringify value for key "${key}":`, stringifyError);
        return false;
      }
      
      // 检查wx API是否可用
      if (typeof wx === 'undefined' || !wx.setStorageSync) {
        console.error(`${this.logPrefix} wx.setStorageSync is not available`);
        return false;
      }
      
      // 保存到存储
      wx.setStorageSync(key, stringValue);
      console.log(`${this.logPrefix} setItem success: ${key} = ${stringValue.substring(0, 50)}${stringValue.length > 50 ? '...' : ''}`);
      return true;
    } catch (e) {
      console.error(`${this.logPrefix} setItem failed for key "${key}":`, e);
      console.warn(`${this.logPrefix} Data not persisted, but game will continue`);
      return false;
    }
  }

  /**
   * 从本地存储读取数据
   * 实现完整的错误处理和降级方案
   * @param {string} key - 存储键名
   * @param {any} defaultValue - 默认值（当键不存在或读取失败时返回）
   * @returns {any} - 读取的值或默认值
   * 需求: 3.2, 3.3
   */
  getItem(key, defaultValue = null) {
    try {
      // 验证参数
      if (!key) {
        console.error(`${this.logPrefix} getItem failed: key is required`);
        return defaultValue;
      }
      
      // 检查wx API是否可用
      if (typeof wx === 'undefined' || !wx.getStorageSync) {
        console.error(`${this.logPrefix} wx.getStorageSync is not available`);
        return defaultValue;
      }

      const value = wx.getStorageSync(key);
      
      // 如果值为空字符串、null或undefined，返回默认值
      if (value === '' || value === undefined || value === null) {
        console.log(`${this.logPrefix} getItem: key "${key}" not found, returning default value`);
        return defaultValue;
      }

      console.log(`${this.logPrefix} getItem success: ${key} = ${value.toString().substring(0, 50)}${value.toString().length > 50 ? '...' : ''}`);
      return value;
    } catch (e) {
      console.error(`${this.logPrefix} getItem failed for key "${key}":`, e);
      console.warn(`${this.logPrefix} Returning default value due to error`);
      return defaultValue;
    }
  }

  /**
   * 从本地存储删除数据
   * @param {string} key - 存储键名
   * @returns {boolean} - 删除是否成功
   */
  removeItem(key) {
    try {
      if (!key) {
        console.error(`${this.logPrefix} removeItem failed: key is required`);
        return false;
      }

      wx.removeStorageSync(key);
      console.log(`${this.logPrefix} removeItem success: ${key}`);
      return true;
    } catch (e) {
      console.error(`${this.logPrefix} removeItem failed for key "${key}":`, e);
      return false;
    }
  }

  /**
   * 清空所有本地存储数据
   * @returns {boolean} - 清空是否成功
   */
  clear() {
    try {
      wx.clearStorageSync();
      console.log(`${this.logPrefix} clear success: all storage cleared`);
      return true;
    } catch (e) {
      console.error(`${this.logPrefix} clear failed:`, e);
      return false;
    }
  }

  /**
   * 获取所有存储的键名
   * @returns {Array<string>} - 键名数组
   */
  getAllKeys() {
    try {
      const info = wx.getStorageInfoSync();
      console.log(`${this.logPrefix} getAllKeys success: ${info.keys.length} keys found`);
      return info.keys || [];
    } catch (e) {
      console.error(`${this.logPrefix} getAllKeys failed:`, e);
      return [];
    }
  }

  /**
   * 获取存储信息（当前占用空间等）
   * @returns {Object|null} - 存储信息对象
   */
  getStorageInfo() {
    try {
      const info = wx.getStorageInfoSync();
      console.log(`${this.logPrefix} getStorageInfo success:`, info);
      return info;
    } catch (e) {
      console.error(`${this.logPrefix} getStorageInfo failed:`, e);
      return null;
    }
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageAdapter;
}
