/**
 * game.js - 微信小游戏入口文件
 * 负责初始化Canvas、创建游戏引擎实例并启动游戏
 * 需求: 1.1
 */

// 导入游戏引擎和相关模块
// 在微信小游戏中，使用require加载模块
const GameEngine = require('./js/engine/GameEngine.js');

/**
 * 初始化游戏
 * 获取Canvas实例和2D上下文，创建GameEngine实例并启动游戏
 */
function initGame() {
  console.log('[game.js] Initializing WeChat Mini Game...');
  
  try {
    // 获取Canvas实例
    // 在微信小游戏中，canvas是全局对象
    const canvas = wx.createCanvas();
    
    // 获取2D渲染上下文
    const context = canvas.getContext('2d');
    
    // 设置Canvas尺寸为屏幕尺寸
    const systemInfo = wx.getSystemInfoSync();
    canvas.width = systemInfo.windowWidth;
    canvas.height = systemInfo.windowHeight;
    
    console.log(`[game.js] Canvas created: ${canvas.width}x${canvas.height}`);
    
    // 创建GameEngine实例并传入canvas和context
    // 需求: 1.1
    const gameEngine = new GameEngine(canvas, context);
    
    console.log('[game.js] GameEngine instance created');
    
    // 调用gameEngine.init()初始化游戏
    // 需求: 1.1
    gameEngine.init();
    
    console.log('[game.js] Game initialized');
    
    // 调用gameEngine.gameLoop()启动游戏循环
    // 需求: 1.1
    gameEngine.gameLoop();
    
    console.log('[game.js] Game loop started');
    
  } catch (error) {
    console.error('[game.js] Failed to initialize game:', error);
    
    // 显示错误信息给用户
    wx.showToast({
      title: '游戏初始化失败',
      icon: 'none',
      duration: 3000
    });
  }
}

// 当小游戏启动时，自动初始化游戏
// 微信小游戏会在加载完成后自动执行脚本
initGame();
