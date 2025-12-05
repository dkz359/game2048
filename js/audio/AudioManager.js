/**
 * AudioManager - 音频管理器
 * 负责管理游戏音效的播放和静音控制
 * 使用Web Audio API程序化生成音效
 */
class AudioManager {
  constructor(storage) {
    this.muted = false;
    this.audioContexts = {};
    this.storage = storage;
    
    // 初始化Web Audio API
    this.initAudioContext();
    
    this.loadAudioSettings();
  }
  
  /**
   * 初始化Web Audio Context
   * 微信小游戏支持Web Audio API
   */
  initAudioContext() {
    try {
      // 微信小游戏环境中的AudioContext
      this.audioContext = wx.createWebAudioContext ? wx.createWebAudioContext() : null;
      
      if (this.audioContext) {
        console.log('[AudioManager] Web Audio Context initialized');
      } else {
        console.warn('[AudioManager] Web Audio Context not available');
      }
    } catch (e) {
      console.error('[AudioManager] Failed to initialize Audio Context:', e);
      this.audioContext = null;
    }
  }
  
  /**
   * 从本地存储加载音频设置
   * 使用StorageAdapter保存音效开关状态
   * 实现错误处理和降级方案
   * 需求: 3.2, 3.3, 5.5
   */
  loadAudioSettings() {
    try {
      if (!this.storage) {
        console.error('[AudioManager] Storage adapter not available');
        this.muted = false;
        return;
      }
      
      const muted = this.storage.getItem('soundMuted', 'false');
      this.muted = muted === 'true';
      console.log(`[AudioManager] Audio settings loaded: muted=${this.muted}`);
    } catch (e) {
      console.error('[AudioManager] Failed to load audio settings:', e);
      console.warn('[AudioManager] Using default audio settings: muted=false');
      this.muted = false;
    }
  }
  
  /**
   * 播放方块移动音效
   * 需求: 5.1
   */
  playMove() {
    if (!this.muted) {
      this.playSound('move');
    }
  }
  
  /**
   * 播放方块合并音效
   * 需求: 5.2
   */
  playMerge() {
    if (!this.muted) {
      this.playSound('merge');
    }
  }
  
  /**
   * 播放胜利音效
   * 需求: 5.3
   */
  playWin() {
    if (!this.muted) {
      this.playSound('win');
    }
  }
  
  /**
   * 播放游戏结束音效
   * 需求: 5.4
   */
  playGameOver() {
    if (!this.muted) {
      this.playSound('gameover');
    }
  }
  
  /**
   * 播放指定类型的音效
   * 使用Web Audio API程序化生成音效
   * @param {string} type - 音效类型 (move, merge, win, gameover)
   * 需求: 3.3, 5.1, 5.2, 5.3, 5.4
   */
  playSound(type) {
    if (!this.audioContext) {
      console.warn('[AudioManager] Audio Context not available');
      return;
    }
    
    try {
      switch (type) {
        case 'move':
          this.playMoveSound();
          break;
        case 'merge':
          this.playMergeSound();
          break;
        case 'win':
          this.playWinSound();
          break;
        case 'gameover':
          this.playGameOverSound();
          break;
        default:
          console.warn(`[AudioManager] Unknown sound type: ${type}`);
      }
    } catch (e) {
      console.error(`[AudioManager] Error playing sound ${type}:`, e);
    }
  }
  
  /**
   * 生成移动音效 - 简短的"滴"声
   */
  playMoveSound() {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }
  
  /**
   * 生成合并音效 - 上升的音调
   */
  playMergeSound() {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    oscillator.type = 'triangle';
    
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }
  
  /**
   * 生成胜利音效 - 欢快的上升音阶
   */
  playWinSound() {
    const ctx = this.audioContext;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + index * 0.15;
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  }
  
  /**
   * 生成游戏结束音效 - 下降的音调
   */
  playGameOverSound() {
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }
  
  /**
   * 切换静音状态
   * 使用StorageAdapter保存音效开关状态
   * 在设置变化时立即保存
   * 实现错误处理
   * 需求: 3.2, 3.3, 5.5
   * @returns {boolean} 返回新的静音状态
   */
  toggleMute() {
    this.muted = !this.muted;
    
    try {
      if (!this.storage) {
        console.error('[AudioManager] Storage adapter not available, cannot save mute state');
        return this.muted;
      }
      
      const success = this.storage.setItem('soundMuted', this.muted.toString());
      
      if (success) {
        console.log(`[AudioManager] Audio settings saved: muted=${this.muted}`);
      } else {
        console.warn('[AudioManager] Failed to save audio settings, but continuing with new state');
      }
    } catch (e) {
      console.error('[AudioManager] Failed to save audio settings:', e);
      console.warn('[AudioManager] Mute state changed but not persisted');
    }
    
    return this.muted;
  }
  
  /**
   * 获取当前静音状态
   * @returns {boolean} 当前是否静音
   */
  isMuted() {
    return this.muted;
  }
}

// 导出模块（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
