# 设计文档

## 概述

本设计文档描述如何将现有的Web版2048柴犬游戏转换为微信小游戏。微信小游戏基于微信小程序框架，使用Canvas进行渲染，需要遵循微信平台的API规范和性能要求。

核心设计策略：
- 使用Canvas 2D API替代DOM操作进行渲染
- 采用微信小游戏API替代Web API（localStorage、Audio等）
- 保留原有游戏逻辑核心代码，重构渲染和输入层
- 实现响应式Canvas布局以适配不同屏幕尺寸

## 架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    微信小游戏容器                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │  game.js     │◄────►│  GameEngine  │               │
│  │  (入口文件)   │      │  (游戏引擎)   │               │
│  └──────────────┘      └───────┬──────┘               │
│                                │                        │
│         ┌──────────────────────┼──────────────────┐    │
│         │                      │                  │    │
│         ▼                      ▼                  ▼    │
│  ┌─────────────┐      ┌──────────────┐   ┌──────────┐ │
│  │  Renderer   │      │  InputMgr    │   │ AudioMgr │ │
│  │ (渲染器)     │      │ (输入管理)    │   │(音频管理)│ │
│  └──────┬──────┘      └──────┬───────┘   └────┬─────┘ │
│         │                    │                 │       │
│         ▼                    ▼                 ▼       │
│  ┌─────────────┐      ┌──────────────┐   ┌──────────┐ │
│  │   Canvas    │      │ wx.onTouch*  │   │wx.create │ │
│  │     API     │      │              │   │InnerAudio│ │
│  └─────────────┘      └──────────────┘   └──────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           StorageAdapter (存储适配器)              │  │
│  │           wx.setStorageSync / getStorageSync     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 模块职责

1. **game.js (入口文件)**
   - 初始化Canvas
   - 创建GameEngine实例
   - 启动游戏循环

2. **GameEngine (游戏引擎)**
   - 管理游戏状态（网格、分数、历史记录）
   - 实现游戏逻辑（移动、合并、检测游戏结束）
   - 协调各个管理器

3. **Renderer (渲染器)**
   - Canvas绘制游戏界面
   - 处理动画效果
   - 响应式布局计算

4. **InputManager (输入管理器)**
   - 监听触摸事件
   - 识别滑动手势
   - 处理按钮点击

5. **AudioManager (音频管理器)**
   - 管理音频资源
   - 播放音效
   - 控制静音状态

6. **StorageAdapter (存储适配器)**
   - 封装微信存储API
   - 保存/读取游戏数据

## 组件和接口

### 1. GameEngine

```javascript
class GameEngine {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.ctx = context;
    this.grid = [];
    this.score = 0;
    this.bestScore = 0;
    this.won = false;
    this.keepPlaying = false;
    this.gameHistory = [];
    this.undoCount = 5;
    this.gridSize = 4;
    
    this.renderer = new Renderer(canvas, context);
    this.inputManager = new InputManager(canvas);
    this.audioManager = new AudioManager();
    this.storage = new StorageAdapter();
  }
  
  init() {
    // 初始化游戏
    this.loadBestScore();
    this.resetGrid();
    this.addRandomTile();
    this.addRandomTile();
    this.render();
  }
  
  move(direction) {
    // 移动逻辑（保留原有代码逻辑）
  }
  
  undo() {
    // 撤销逻辑
  }
  
  resetGrid() {
    // 重置网格
  }
  
  addRandomTile() {
    // 添加随机方块
  }
  
  render() {
    // 调用渲染器绘制
    this.renderer.render(this.grid, this.score, this.bestScore, this.undoCount);
  }
  
  gameLoop() {
    // 游戏主循环
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}
```

### 2. Renderer

```javascript
class Renderer {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.ctx = context;
    this.cellSize = 0;
    this.cellPadding = 0;
    this.gridStartX = 0;
    this.gridStartY = 0;
    this.images = {};
    this.theme = 'light'; // 'light' or 'dark'
    
    this.calculateLayout();
    this.loadImages();
  }
  
  calculateLayout() {
    // 根据屏幕尺寸计算布局参数
    const systemInfo = wx.getSystemInfoSync();
    const screenWidth = systemInfo.windowWidth;
    const screenHeight = systemInfo.windowHeight;
    
    // 计算游戏网格大小
    const maxGridSize = Math.min(screenWidth - 40, screenHeight * 0.6);
    this.cellSize = (maxGridSize - 75) / 4; // 4个格子 + 5个间距
    this.cellPadding = 15;
    this.gridStartX = (screenWidth - maxGridSize) / 2;
    this.gridStartY = 200; // 为顶部UI预留空间
  }
  
  loadImages() {
    // 预加载所有柴犬图片
    const imageMap = {
      2: 'images/shiba_happy.png',
      4: 'images/shiba_happy.png',
      8: 'images/shiba_excited.png',
      16: 'images/shiba_excited.png',
      32: 'images/shiba_cool.png',
      64: 'images/shiba_cool.png',
      128: 'images/shiba_amazed.png',
      256: 'images/shiba_amazed.png',
      512: 'images/shiba_proud.png',
      1024: 'images/shiba_proud.png',
      2048: 'images/shiba_proud.png'
    };
    
    Object.keys(imageMap).forEach(key => {
      const img = this.canvas.createImage();
      img.src = imageMap[key];
      img.onload = () => {
        this.images[key] = img;
      };
    });
  }
  
  render(grid, score, bestScore, undoCount) {
    // 清空画布
    this.clearCanvas();
    
    // 绘制背景
    this.drawBackground();
    
    // 绘制顶部UI（分数、按钮）
    this.drawHeader(score, bestScore, undoCount);
    
    // 绘制游戏网格
    this.drawGrid();
    
    // 绘制方块
    this.drawTiles(grid);
  }
  
  clearCanvas() {
    const bgColor = this.theme === 'dark' ? '#2c2416' : '#fff8f0';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  drawBackground() {
    // 绘制渐变背景
  }
  
  drawHeader(score, bestScore, undoCount) {
    // 绘制分数显示
    // 绘制按钮（New、Undo、音效、主题）
  }
  
  drawGrid() {
    // 绘制4x4空网格
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = this.gridStartX + c * (this.cellSize + this.cellPadding) + this.cellPadding;
        const y = this.gridStartY + r * (this.cellSize + this.cellPadding) + this.cellPadding;
        
        this.ctx.fillStyle = this.theme === 'dark' ? '#5c4a2f' : '#e8d4bc';
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }
  
  drawTiles(grid) {
    // 绘制所有方块
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          this.drawTile(r, c, cell.value);
        }
      });
    });
  }
  
  drawTile(row, col, value) {
    const x = this.gridStartX + col * (this.cellSize + this.cellPadding) + this.cellPadding;
    const y = this.gridStartY + row * (this.cellSize + this.cellPadding) + this.cellPadding;
    
    // 绘制方块背景
    this.ctx.fillStyle = this.getTileColor(value);
    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
    
    // 绘制柴犬图片
    if (this.images[value]) {
      const imgSize = this.cellSize * 0.5;
      const imgX = x + (this.cellSize - imgSize) / 2;
      const imgY = y + this.cellSize * 0.2;
      this.ctx.drawImage(this.images[value], imgX, imgY, imgSize, imgSize);
    }
    
    // 绘制数字
    this.ctx.fillStyle = value <= 4 ? '#8b6f47' : '#fff';
    this.ctx.font = `bold ${this.cellSize * 0.25}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(value, x + this.cellSize / 2, y + this.cellSize * 0.8);
  }
  
  getTileColor(value) {
    const colors = {
      2: '#ffefd5',
      4: '#ffe4b5',
      8: '#ffd89b',
      16: '#ffcc80',
      32: '#ffb74d',
      64: '#ffa726',
      128: '#ff9800',
      256: '#fb8c00',
      512: '#f57c00',
      1024: '#ef6c00',
      2048: '#e65100'
    };
    return colors[value] || '#bf360c';
  }
  
  setTheme(theme) {
    this.theme = theme;
  }
}
```

### 3. InputManager

```javascript
class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.onMove = null; // 回调函数
    this.onButtonClick = null; // 按钮点击回调
    
    this.bindEvents();
  }
  
  bindEvents() {
    // 触摸开始
    wx.onTouchStart((e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    });
    
    // 触摸结束
    wx.onTouchEnd((e) => {
      if (e.changedTouches.length > 0) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        this.handleSwipe(touchEndX, touchEndY);
      }
    });
    
    // 点击事件（用于按钮）
    wx.onTouchStart((e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.handleButtonClick(touch.clientX, touch.clientY);
      }
    });
  }
  
  handleSwipe(endX, endY) {
    const dx = endX - this.touchStartX;
    const dy = endY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (Math.max(absDx, absDy) > 20) { // 滑动阈值
      let direction;
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      
      if (this.onMove) {
        this.onMove(direction);
      }
    }
  }
  
  handleButtonClick(x, y) {
    // 检测点击位置是否在按钮区域
    // 调用对应的按钮回调
    if (this.onButtonClick) {
      this.onButtonClick(x, y);
    }
  }
  
  setMoveCallback(callback) {
    this.onMove = callback;
  }
  
  setButtonClickCallback(callback) {
    this.onButtonClick = callback;
  }
}
```

### 4. AudioManager

```javascript
class AudioManager {
  constructor() {
    this.muted = false;
    this.audioContexts = {};
    
    this.loadAudioSettings();
  }
  
  loadAudioSettings() {
    try {
      const muted = wx.getStorageSync('soundMuted');
      this.muted = muted === 'true';
    } catch (e) {
      console.error('Failed to load audio settings', e);
    }
  }
  
  playMove() {
    if (!this.muted) {
      this.playSound('move');
    }
  }
  
  playMerge() {
    if (!this.muted) {
      this.playSound('merge');
    }
  }
  
  playWin() {
    if (!this.muted) {
      this.playSound('win');
    }
  }
  
  playGameOver() {
    if (!this.muted) {
      this.playSound('gameover');
    }
  }
  
  playSound(type) {
    // 使用微信音频API
    const audio = wx.createInnerAudioContext();
    audio.src = `audio/${type}.mp3`;
    audio.play();
    
    audio.onEnded(() => {
      audio.destroy();
    });
    
    audio.onError((err) => {
      console.error('Audio play error', err);
      audio.destroy();
    });
  }
  
  toggleMute() {
    this.muted = !this.muted;
    try {
      wx.setStorageSync('soundMuted', this.muted.toString());
    } catch (e) {
      console.error('Failed to save audio settings', e);
    }
    return this.muted;
  }
  
  isMuted() {
    return this.muted;
  }
}
```

### 5. StorageAdapter

```javascript
class StorageAdapter {
  setItem(key, value) {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.error('Storage set error', e);
    }
  }
  
  getItem(key) {
    try {
      return wx.getStorageSync(key);
    } catch (e) {
      console.error('Storage get error', e);
      return null;
    }
  }
  
  removeItem(key) {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.error('Storage remove error', e);
    }
  }
}
```

## 数据模型

### 游戏状态

```javascript
{
  grid: [
    [null, {value: 2}, null, null],
    [null, null, {value: 4}, null],
    [null, null, null, null],
    [null, null, null, null]
  ],
  score: 6,
  bestScore: 1024,
  won: false,
  keepPlaying: false,
  undoCount: 5,
  theme: 'light', // 'light' or 'dark'
  muted: false
}
```

### 历史记录

```javascript
{
  grid: [...], // 网格快照
  score: 6,
  won: false,
  keepPlaying: false
}
```

### 本地存储数据

```javascript
{
  bestScore: 1024,
  darkMode: 'false',
  soundMuted: 'false'
}
```

## 错误处理

### 1. 资源加载失败

- **场景**: 图片或音频资源加载失败
- **处理**: 
  - 记录错误日志
  - 使用降级方案（纯色方块代替图片）
  - 不中断游戏流程

### 2. 存储操作失败

- **场景**: wx.setStorageSync 或 wx.getStorageSync 失败
- **处理**:
  - 捕获异常并记录日志
  - 使用内存中的默认值
  - 继续游戏，不影响核心功能

### 3. 音频播放失败

- **场景**: wx.createInnerAudioContext 创建或播放失败
- **处理**:
  - 捕获错误并记录
  - 静默失败，不影响游戏进行
  - 销毁失败的音频实例

### 4. Canvas渲染错误

- **场景**: Canvas API调用失败
- **处理**:
  - 使用try-catch包裹关键渲染代码
  - 记录错误信息
  - 尝试重新初始化Canvas

## 测试策略

### 1. 单元测试

- **GameEngine核心逻辑**
  - 测试移动算法（上下左右）
  - 测试合并逻辑
  - 测试游戏结束检测
  - 测试撤销功能

- **StorageAdapter**
  - 测试数据保存和读取
  - 测试错误处理

### 2. 集成测试

- **输入到渲染流程**
  - 测试滑动手势识别
  - 测试方块移动动画
  - 测试分数更新显示

- **音频系统**
  - 测试音效播放时机
  - 测试静音功能

### 3. 性能测试

- **渲染性能**
  - 测试帧率（目标: ≥30fps）
  - 测试内存占用（目标: ≤50MB）

- **响应性能**
  - 测试触摸响应延迟（目标: ≤50ms）
  - 测试游戏启动时间（目标: ≤3s）

### 4. 兼容性测试

- **设备测试**
  - 测试不同屏幕尺寸（iPhone SE, iPhone 14 Pro Max, 小米等）
  - 测试不同微信版本

- **边界测试**
  - 测试极端分数值
  - 测试快速连续操作
  - 测试网络断开情况

## 文件结构

```
wechat-mini-game/
├── game.js              # 游戏入口文件
├── game.json            # 游戏配置文件
├── project.config.json  # 项目配置文件
├── js/
│   ├── engine/
│   │   └── GameEngine.js    # 游戏引擎
│   ├── renderer/
│   │   └── Renderer.js      # 渲染器
│   ├── input/
│   │   └── InputManager.js  # 输入管理器
│   ├── audio/
│   │   └── AudioManager.js  # 音频管理器
│   └── storage/
│       └── StorageAdapter.js # 存储适配器
├── images/
│   ├── shiba_mascot.png
│   ├── shiba_happy.png
│   ├── shiba_excited.png
│   ├── shiba_cool.png
│   ├── shiba_amazed.png
│   └── shiba_proud.png
└── audio/
    ├── move.mp3
    ├── merge.mp3
    ├── win.mp3
    └── gameover.mp3
```

## 性能优化

### 1. 渲染优化

- 使用离屏Canvas预渲染静态元素（网格背景）
- 只在游戏状态变化时重绘
- 使用requestAnimationFrame控制渲染频率

### 2. 资源优化

- 图片压缩（使用WebP格式，质量80%）
- 音频文件使用MP3格式，码率64kbps
- 实现资源懒加载（按需加载音频）

### 3. 内存优化

- 及时销毁不用的音频实例
- 限制历史记录数量（最多5条）
- 避免创建不必要的对象

### 4. 代码优化

- 使用对象池管理方块对象
- 减少Canvas状态切换次数
- 批量处理绘制操作

## 微信小游戏特定配置

### game.json

```json
{
  "deviceOrientation": "portrait",
  "showStatusBar": false,
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  }
}
```

### project.config.json

```json
{
  "miniprogramRoot": "./",
  "projectname": "2048-shiba",
  "description": "2048柴犬小游戏",
  "appid": "your-appid",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "postcss": true,
    "minified": true
  }
}
```
