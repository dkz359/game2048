/**
 * Renderer - 渲染器
 * 负责使用Canvas API绘制游戏界面
 * 包括响应式布局计算、背景绘制、方块颜色映射等基础功能
 */
class Renderer {
  constructor(canvas, context, storage) {
    this.canvas = canvas;
    this.ctx = context;
    this.storage = storage;
    
    // 布局参数
    this.cellSize = 0;
    this.cellPadding = 0;
    this.gridStartX = 0;
    this.gridStartY = 0;
    
    // 主题设置
    this.theme = 'light'; // 'light' or 'dark'
    this.targetTheme = 'light'; // 目标主题（用于动画过渡）
    this.themeTransition = 0; // 主题过渡进度 (0-1)
    this.themeTransitionDuration = 300; // 过渡时长（毫秒）
    this.themeTransitionStartTime = 0; // 过渡开始时间
    this.isTransitioning = false; // 是否正在过渡
    
    // 图片资源
    this.images = {};
    this.imagesLoaded = false;
    this.imageLoadCount = 0;
    this.totalImages = 0;
    
    // 消息弹窗
    this.message = null; // 当前显示的消息对象
    
    // 动画系统
    // 需求: 4.5, 10.1, 10.2
    this.animations = []; // 当前活动的动画列表
    this.animationDuration = 100; // 动画时长（毫秒）
    
    // 计算布局参数
    this.calculateLayout();
    
    // 加载保存的主题设置
    this.loadThemeSettings();
    
    // 预加载图片
    this.loadImages();
  }
  
  /**
   * 设置AudioManager引用
   * 用于在渲染时检查音效状态
   * @param {AudioManager} audioManager - 音频管理器实例
   */
  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }
  
  /**
   * 从本地存储加载主题设置
   * 使用StorageAdapter保存深色模式偏好
   * 在游戏启动时加载所有保存的设置
   * 需求: 3.2, 8.3, 8.4
   */
  loadThemeSettings() {
    try {
      const darkMode = this.storage.getItem('darkMode', 'false');
      this.theme = darkMode === 'true' ? 'dark' : 'light';
      this.targetTheme = this.theme;
      console.log(`[Renderer] Theme settings loaded: theme=${this.theme}`);
    } catch (e) {
      console.error('[Renderer] Failed to load theme settings', e);
      this.theme = 'light';
      this.targetTheme = 'light';
    }
  }
  
  /**
   * 计算响应式布局参数
   * 根据屏幕尺寸动态调整游戏网格大小和位置
   * 需求: 9.1, 9.2, 9.3, 9.4
   */
  calculateLayout() {
    try {
      // 使用wx.getSystemInfoSync获取屏幕尺寸
      const systemInfo = wx.getSystemInfoSync();
      const screenWidth = systemInfo.windowWidth;
      const screenHeight = systemInfo.windowHeight;
      
      console.log(`[Renderer] Screen size: ${screenWidth}x${screenHeight}`);
      
      // 计算游戏网格大小
      const horizontalPadding = 40;
      const headerHeight = 120; // 顶部UI高度（分数+按钮）
      
      const availableWidth = screenWidth - horizontalPadding;
      // 为整体内容（header + grid）预留空间
      const availableHeight = screenHeight - 100; // 上下各留50px
      const maxGridSize = Math.min(availableWidth, availableHeight - headerHeight);
      
      // 计算单个方块大小（4个格子 + 5个间距）
      this.cellPadding = 12;
      this.cellSize = (maxGridSize - this.cellPadding * 5) / 4;
      
      // 计算总内容高度（header + grid）
      const totalContentHeight = headerHeight + maxGridSize;
      
      // 垂直居中：计算顶部偏移
      const topOffset = (screenHeight - totalContentHeight) / 2;
      
      // 计算网格起始位置
      this.gridStartX = (screenWidth - maxGridSize) / 2;
      this.gridStartY = topOffset + headerHeight;
      this.headerStartY = topOffset; // 保存header起始Y坐标
      
      // 屏幕宽度小于375像素时使用紧凑布局
      if (screenWidth < 375) {
        this.cellPadding = 10;
        this.cellSize = (maxGridSize - this.cellPadding * 5) / 4;
      }
      
      // 保存网格总宽度供其他方法使用
      this.gridWidth = maxGridSize;
      
      // 设置Canvas尺寸
      this.canvas.width = screenWidth;
      this.canvas.height = screenHeight;
      
      console.log(`[Renderer] Layout calculated - cellSize: ${this.cellSize}, padding: ${this.cellPadding}, gridStartY: ${this.gridStartY}, topOffset: ${topOffset}`);
    } catch (e) {
      console.error('[Renderer] Failed to calculate layout:', e);
      
      // 使用默认值作为降级方案
      this.cellSize = 80;
      this.cellPadding = 12;
      this.gridStartX = 20;
      this.gridStartY = 200;
      this.headerStartY = 80;
      this.gridWidth = 360;
      this.canvas.width = 375;
      this.canvas.height = 667;
    }
  }
  
  /**
   * 清空Canvas画布
   * 根据当前主题应用背景色（支持过渡动画）
   * 需求: 1.2, 8.2, 8.5
   */
  clearCanvas() {
    try {
      // 根据主题选择背景色
      const bgColor = this.getThemeColor(
        '#fff8f0', // light
        '#2c2416'  // dark
      );
      
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } catch (e) {
      console.error('[Renderer] Failed to clear canvas:', e);
    }
  }
  
  /**
   * 绘制背景
   * 绘制渐变背景效果（支持过渡动画）
   * 需求: 1.2, 8.2, 8.5
   */
  drawBackground() {
    try {
      // 创建渐变背景
      const gradient = this.ctx.createLinearGradient(
        0, 0, 
        0, this.canvas.height
      );
      
      // 使用过渡颜色
      const topColor = this.getThemeColor('#fffaf0', '#3d2f1f');
      const bottomColor = this.getThemeColor('#fff8f0', '#2c2416');
      
      gradient.addColorStop(0, topColor);
      gradient.addColorStop(1, bottomColor);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } catch (e) {
      console.error('[Renderer] Failed to draw background:', e);
    }
  }
  
  /**
   * 获取方块颜色
   * 根据方块数值返回对应的背景颜色
   * @param {number} value - 方块数值
   * @returns {string} - 颜色值（十六进制）
   */
  getTileColor(value) {
    // 方块颜色映射表
    const colors = {
      2: '#ffefd5',      // 浅橙色
      4: '#ffe4b5',      // 浅黄橙色
      8: '#ffd89b',      // 金黄色
      16: '#ffcc80',     // 橙黄色
      32: '#ffb74d',     // 深橙黄色
      64: '#ffa726',     // 橙色
      128: '#ff9800',    // 深橙色
      256: '#fb8c00',    // 更深橙色
      512: '#f57c00',    // 暗橙色
      1024: '#ef6c00',   // 深暗橙色
      2048: '#e65100'    // 最深橙色
    };
    
    // 如果数值超过2048，返回最深的颜色
    return colors[value] || '#bf360c';
  }
  
  /**
   * 预加载柴犬图片
   * 使用canvas.createImage加载所有柴犬表情图片
   * 实现降级方案：图片加载失败时使用纯色方块
   * 需求: 3.3, 4.1, 4.2
   */
  loadImages() {
    try {
      // 图片映射表：根据方块数值显示对应的柴犬表情
      // 需求: 4.3
      const imageMap = {
        2: 'images/shiba_happy.png',      // 2-4: 开心柴犬
        4: 'images/shiba_happy.png',
        8: 'images/shiba_excited.png',    // 8-16: 兴奋柴犬
        16: 'images/shiba_excited.png',
        32: 'images/shiba_cool.png',      // 32-64: 酷炫柴犬
        64: 'images/shiba_cool.png',
        128: 'images/shiba_amazed.png',   // 128-256: 惊讶柴犬
        256: 'images/shiba_amazed.png',
        512: 'images/shiba_proud.png',    // 512及以上: 骄傲柴犬
        1024: 'images/shiba_proud.png',
        2048: 'images/shiba_proud.png',
        mascot: 'images/shiba_mascot.png' // 吉祥物
      };
      
      this.totalImages = Object.keys(imageMap).length;
      this.imageLoadCount = 0;
      
      console.log(`[Renderer] Loading ${this.totalImages} images...`);
      
      // 遍历加载所有图片
      Object.keys(imageMap).forEach(key => {
        try {
          // 微信小游戏使用wx.createImage()创建图片对象
          const img = wx.createImage();
          img.src = imageMap[key];
          
          img.onload = () => {
            this.images[key] = img;
            this.imageLoadCount++;
            
            console.log(`[Renderer] Image loaded for value ${key}: ${imageMap[key]} (${this.imageLoadCount}/${this.totalImages})`);
            
            // 所有图片加载完成
            if (this.imageLoadCount === this.totalImages) {
              this.imagesLoaded = true;
              console.log('[Renderer] All images loaded successfully');
            }
          };
          
          img.onerror = (err) => {
            console.error(`[Renderer] Failed to load image for value ${key}:`, err);
            console.warn(`[Renderer] Using fallback (solid color) for tile value ${key}`);
            this.imageLoadCount++;
            
            // 降级方案：图片加载失败时不存储图片对象
            // drawTile方法会检测到图片不存在，只绘制纯色方块
            
            // 即使有图片加载失败，也继续游戏（降级方案）
            if (this.imageLoadCount === this.totalImages) {
              this.imagesLoaded = true;
              console.log('[Renderer] Image loading completed (with some errors, using fallback)');
            }
          };
        } catch (imgError) {
          // 单个图片创建失败时的错误处理
          console.error(`[Renderer] Failed to create image for value ${key}:`, imgError);
          this.imageLoadCount++;
          
          if (this.imageLoadCount === this.totalImages) {
            this.imagesLoaded = true;
            console.log('[Renderer] Image loading completed (with errors)');
          }
        }
      });
    } catch (e) {
      console.error('[Renderer] Critical error in loadImages:', e);
      // 降级方案：标记为已加载，使用纯色方块
      this.imagesLoaded = true;
      console.warn('[Renderer] Using fallback mode: all tiles will use solid colors');
    }
  }
  
  /**
   * 绘制单个方块
   * 绘制方块背景、柴犬图片和数字
   * 实现降级方案：图片加载失败时使用纯色方块
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {number} value - 方块数值
   * 需求: 3.3, 4.2, 4.3, 4.4
   */
  drawTile(row, col, value) {
    try {
      // 计算方块位置
      const x = this.gridStartX + col * (this.cellSize + this.cellPadding) + this.cellPadding;
      const y = this.gridStartY + row * (this.cellSize + this.cellPadding) + this.cellPadding;
      const radius = 6; // 圆角半径
      
      // 1. 绘制圆角方块背景
      this.ctx.fillStyle = this.getTileColor(value);
      this.drawRoundedRect(x, y, this.cellSize, this.cellSize, radius);
      
      // 2. 绘制柴犬图片（如果已加载）
      // 降级方案：如果图片不存在，跳过图片绘制，只显示纯色方块和数字
      if (this.images[value]) {
        try {
          const imgSize = this.cellSize * 0.5;
          const imgX = x + (this.cellSize - imgSize) / 2;
          const imgY = y + this.cellSize * 0.2;
          
          this.ctx.drawImage(this.images[value], imgX, imgY, imgSize, imgSize);
        } catch (imgError) {
          // 图片绘制失败时记录错误，但继续绘制数字
          console.error(`[Renderer] Failed to draw image for tile value ${value}:`, imgError);
          console.warn(`[Renderer] Using fallback (solid color only) for tile value ${value}`);
        }
      } else {
        // 降级方案：图片未加载或加载失败，只显示纯色方块和数字
        console.debug(`[Renderer] Image not available for tile value ${value}, using solid color`);
      }
      
      // 3. 绘制数字
      // 小数值使用深色文字，大数值使用白色文字
      try {
        this.ctx.fillStyle = value <= 4 ? '#776655' : '#fff';
        this.ctx.font = `bold ${this.cellSize * 0.28}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(value.toString(), x + this.cellSize / 2, y + this.cellSize * 0.8);
      } catch (textError) {
        console.error(`[Renderer] Failed to draw text for tile value ${value}:`, textError);
      }
    } catch (e) {
      console.error(`[Renderer] Failed to draw tile at (${row}, ${col}):`, e);
      // 即使绘制失败，也不中断游戏
    }
  }
  
  /**
   * 绘制所有方块
   * 遍历网格并绘制每个非空方块
   * @param {Array} grid - 游戏网格（4x4二维数组）
   * 需求: 4.2, 4.4
   */
  drawTiles(grid) {
    try {
      if (!grid || !Array.isArray(grid)) {
        console.warn('[Renderer] Invalid grid provided to drawTiles');
        return;
      }
      
      // 遍历网格的每一行
      grid.forEach((row, r) => {
        if (!Array.isArray(row)) {
          return;
        }
        
        // 遍历每一列
        row.forEach((cell, c) => {
          // 只绘制非空方块
          if (cell && cell.value) {
            this.drawTile(r, c, cell.value);
          }
        });
      });
    } catch (e) {
      console.error('[Renderer] Failed to draw tiles:', e);
    }
  }
  
  /**
   * 绘制顶部UI
   * 包括分数显示和按钮（New、Undo、音效、主题切换）
   * @param {number} score - 当前分数
   * @param {number} bestScore - 最佳分数
   * @param {number} undoCount - 剩余撤销次数
   * 需求: 1.3, 1.4, 6.4
   */
  drawHeader(score, bestScore, undoCount) {
    try {
      const headerY = this.headerStartY || 20;
      const scoreBoxWidth = 90;
      const scoreBoxHeight = 60;
      const buttonWidth = 80;
      const buttonHeight = 45;
      const smallButtonSize = 50;
      const spacing = 10;
      
      // 第一行：柴犬吉祥物 + 2048标题（左侧） | SCORE + BEST（右侧）
      const mascotSize = 60;
      const mascotX = this.gridStartX;
      const mascotY = headerY;
      
      // 绘制柴犬吉祥物
      if (this.images['mascot']) {
        try {
          this.ctx.drawImage(this.images['mascot'], mascotX, mascotY, mascotSize, mascotSize);
        } catch (e) {
          console.error('[Renderer] Failed to draw mascot:', e);
        }
      }
      
      // 绘制2048标题
      const titleX = mascotX + mascotSize + 15;
      const titleY = headerY + mascotSize / 2;
      const titleColor = this.getThemeColor('#f59563', '#f59563');
      this.ctx.fillStyle = titleColor;
      this.ctx.font = 'bold 52px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('2048', titleX, titleY);
      
      // 分数框（右侧，橙色）
      const gridRightX = this.gridStartX + this.gridWidth;
      const bestScoreX = gridRightX - scoreBoxWidth;
      const scoreX = bestScoreX - scoreBoxWidth - spacing;
      
      this.drawOrangeScoreBox(scoreX, headerY, scoreBoxWidth, scoreBoxHeight, 'SCORE', score);
      this.drawOrangeScoreBox(bestScoreX, headerY, scoreBoxWidth, scoreBoxHeight, 'BEST', bestScore);
      
      // 第二行：提示文字（左侧） | 按钮（右侧）
      const row2Y = headerY + scoreBoxHeight + spacing + 5;
      
      // 绘制提示文字
      const hintColor = this.getThemeColor('#a89080', '#8b7a6a');
      this.ctx.fillStyle = hintColor;
      this.ctx.font = '14px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('Join the numbers to', this.gridStartX, row2Y + 8);
      this.ctx.fillText('get to 2048! 🐕', this.gridStartX, row2Y + 24);
      
      // 按钮（右侧）
      const button4X = gridRightX - smallButtonSize;
      const button3X = button4X - smallButtonSize - spacing;
      const button2X = button3X - buttonWidth - spacing;
      const button1X = button2X - buttonWidth - spacing;
      
      // New 按钮（橙色，宽按钮）
      this.drawOrangeButton(button1X, row2Y, buttonWidth, buttonHeight, 'New', 'new');
      
      // Undo 按钮（灰色，宽按钮，显示次数）
      this.drawGrayButton(button2X, row2Y, buttonWidth, buttonHeight, `Undo (${undoCount})`, 'undo');
      
      // 音效切换按钮（橙色，方形）
      const soundIcon = this.audioManager && this.audioManager.isMuted() ? '🔇' : '🔊';
      this.drawOrangeButton(button3X, row2Y, smallButtonSize, buttonHeight, soundIcon, 'sound');
      
      // 主题切换按钮（橙色，方形）
      const themeIcon = this.theme === 'dark' ? '☀️' : '🌙';
      this.drawOrangeButton(button4X, row2Y, smallButtonSize, buttonHeight, themeIcon, 'theme');
      
    } catch (e) {
      console.error('[Renderer] Failed to draw header:', e);
    }
  }
  
  /**
   * 绘制橙色分数显示框
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {string} label - 标签文字
   * @param {number} value - 分数值
   */
  drawOrangeScoreBox(x, y, width, height, label, value) {
    try {
      const radius = 8;
      
      // 橙色背景
      this.ctx.fillStyle = '#f59563';
      this.drawRoundedRect(x, y, width, height, radius);
      
      // 白色标签
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(label, x + width / 2, y + 10);
      
      // 白色分数
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(value.toString(), x + width / 2, y + height - 8);
    } catch (e) {
      console.error('[Renderer] Failed to draw orange score box:', e);
    }
  }
  
  /**
   * 绘制橙色按钮
   */
  drawOrangeButton(x, y, width, height, text, type) {
    try {
      const radius = 8;
      
      // 橙色背景
      this.ctx.fillStyle = '#f59563';
      this.drawRoundedRect(x, y, width, height, radius);
      
      // 白色文字
      this.ctx.fillStyle = '#fff';
      this.ctx.font = type === 'sound' || type === 'theme' ? '22px sans-serif' : 'bold 16px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, x + width / 2, y + height / 2);
    } catch (e) {
      console.error('[Renderer] Failed to draw orange button:', e);
    }
  }
  
  /**
   * 绘制灰色按钮
   */
  drawGrayButton(x, y, width, height, text, type) {
    try {
      const radius = 8;
      
      // 灰色背景
      this.ctx.fillStyle = '#d4c5b0';
      this.drawRoundedRect(x, y, width, height, radius);
      
      // 深色文字
      this.ctx.fillStyle = '#6b5544';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, x + width / 2, y + height / 2);
    } catch (e) {
      console.error('[Renderer] Failed to draw gray button:', e);
    }
  }
  
  /**
   * 绘制按钮
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {string} text - 按钮文字
   * @param {string} type - 按钮类型 ('new', 'undo', 'sound', 'theme')
   * @param {number} badge - 徽章数字（可选，用于显示撤销次数）
   */
  drawButton(x, y, width, height, text, type, badge) {
    try {
      const radius = 8; // 圆角半径
      
      // 绘制圆角按钮背景（支持过渡）
      const bgColor = this.getThemeColor('#d4b5a0', '#4a3a2a');
      this.ctx.fillStyle = bgColor;
      this.drawRoundedRect(x, y, width, height, radius);
      
      // 绘制按钮文字（支持过渡）
      const textColor = this.getThemeColor('#6b5544', '#e8d4bc');
      this.ctx.fillStyle = textColor;
      
      // 根据按钮类型调整字体大小
      if (type === 'sound' || type === 'theme') {
        this.ctx.font = '22px sans-serif'; // emoji 使用较大字体
      } else {
        this.ctx.font = 'bold 11px sans-serif';
      }
      
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, x + width / 2, y + height / 2);
      
      // 如果有徽章数字（撤销次数），绘制在按钮内部右下角
      if (badge !== undefined && badge !== null && badge > 0) {
        const badgeSize = 14;
        const badgeX = x + width - badgeSize - 3;
        const badgeY = y + height - badgeSize - 3;
        
        // 绘制徽章背景（小圆角矩形）
        this.ctx.fillStyle = this.getThemeColor('#ff8866', '#ff6644');
        this.ctx.beginPath();
        this.ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制徽章数字
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 9px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(badge.toString(), badgeX + badgeSize / 2, badgeY + badgeSize / 2);
      }
    } catch (e) {
      console.error('[Renderer] Failed to draw button:', e);
    }
  }
  
  /**
   * 绘制Undo按钮（带撤销次数）
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {number} count - 剩余撤销次数
   */
  drawUndoButton(x, y, width, height, count) {
    try {
      const radius = 8;
      
      // 绘制圆角按钮背景
      const bgColor = this.getThemeColor('#d4b5a0', '#4a3a2a');
      this.ctx.fillStyle = bgColor;
      this.drawRoundedRect(x, y, width, height, radius);
      
      // 绘制撤销图标（↶）
      const textColor = this.getThemeColor('#6b5544', '#e8d4bc');
      this.ctx.fillStyle = textColor;
      this.ctx.font = '20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('↶', x + width / 2, y + height / 2 - 3);
      
      // 在右下角显示剩余次数
      if (count !== undefined && count !== null && count >= 0) {
        this.ctx.fillStyle = this.getThemeColor('#8b6f47', '#c4b5a0');
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(`(${count})`, x + width - 4, y + height - 3);
      }
    } catch (e) {
      console.error('[Renderer] Failed to draw undo button:', e);
    }
  }
  
  /**
   * 绘制圆角矩形
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   * @param {number} radius - 圆角半径
   */
  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.arcTo(x, y, x + radius, y, radius);
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  /**
   * 绘制4x4空网格
   * 绘制游戏网格的背景格子（支持过渡动画）
   * 需求: 1.2, 8.2, 8.5
   */
  drawGrid() {
    try {
      const radius = 6; // 圆角半径
      // 网格背景色（支持过渡）
      const gridBgColor = this.getThemeColor('#cbb5a0', '#3a2a1a');
      
      // 绘制4x4网格
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const x = this.gridStartX + c * (this.cellSize + this.cellPadding) + this.cellPadding;
          const y = this.gridStartY + r * (this.cellSize + this.cellPadding) + this.cellPadding;
          
          this.ctx.fillStyle = gridBgColor;
          this.drawRoundedRect(x, y, this.cellSize, this.cellSize, radius);
        }
      }
    } catch (e) {
      console.error('[Renderer] Failed to draw grid:', e);
    }
  }
  
  /**
   * 设置主题（带300毫秒过渡动画）
   * 使用StorageAdapter保存深色模式偏好
   * 在设置变化时立即保存
   * @param {string} theme - 主题名称 ('light' 或 'dark')
   * 需求: 3.2, 8.1, 8.2, 8.3, 8.4, 8.5
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`[Renderer] Invalid theme: ${theme}`);
      return;
    }
    
    // 如果主题没有变化，不需要过渡
    if (this.theme === theme) {
      console.log(`[Renderer] Theme already set to: ${theme}`);
      return;
    }
    
    // 开始主题过渡动画
    this.targetTheme = theme;
    this.themeTransition = 0;
    this.themeTransitionStartTime = Date.now();
    this.isTransitioning = true;
    
    // 保存主题偏好到本地存储
    try {
      this.storage.setItem('darkMode', (theme === 'dark').toString());
      console.log(`[Renderer] Theme settings saved: theme=${theme}`);
    } catch (e) {
      console.error('[Renderer] Failed to save theme settings', e);
    }
    
    console.log(`[Renderer] Starting theme transition from ${this.theme} to ${theme}`);
  }
  
  /**
   * 更新主题过渡动画
   * 在每一帧调用以更新过渡进度
   * 需求: 8.5
   */
  updateThemeTransition() {
    if (!this.isTransitioning) {
      return;
    }
    
    const elapsed = Date.now() - this.themeTransitionStartTime;
    this.themeTransition = Math.min(elapsed / this.themeTransitionDuration, 1);
    
    // 使用缓动函数（ease-in-out）使过渡更平滑
    const eased = this.easeInOutCubic(this.themeTransition);
    
    // 过渡完成
    if (this.themeTransition >= 1) {
      this.theme = this.targetTheme;
      this.isTransitioning = false;
      this.themeTransition = 0;
      console.log(`[Renderer] Theme transition completed: ${this.theme}`);
    }
  }
  
  /**
   * 缓动函数：ease-in-out cubic
   * @param {number} t - 进度值 (0-1)
   * @returns {number} - 缓动后的值 (0-1)
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * 获取主题颜色（支持过渡动画）
   * 根据当前过渡进度在两个颜色之间插值
   * @param {string} lightColor - 浅色主题颜色（十六进制）
   * @param {string} darkColor - 深色主题颜色（十六进制）
   * @returns {string} - 插值后的颜色（十六进制）
   * 需求: 8.5
   */
  getThemeColor(lightColor, darkColor) {
    // 如果没有在过渡中，直接返回当前主题的颜色
    if (!this.isTransitioning) {
      return this.theme === 'dark' ? darkColor : lightColor;
    }
    
    // 计算过渡进度（考虑缓动）
    const progress = this.easeInOutCubic(this.themeTransition);
    
    // 确定起始和目标颜色
    const fromColor = this.theme === 'light' ? lightColor : darkColor;
    const toColor = this.targetTheme === 'light' ? lightColor : darkColor;
    
    // 颜色插值
    return this.interpolateColor(fromColor, toColor, progress);
  }
  
  /**
   * 颜色插值
   * 在两个十六进制颜色之间进行线性插值
   * @param {string} color1 - 起始颜色（十六进制，如 '#ffffff'）
   * @param {string} color2 - 目标颜色（十六进制）
   * @param {number} factor - 插值因子 (0-1)
   * @returns {string} - 插值后的颜色（十六进制）
   */
  interpolateColor(color1, color2, factor) {
    try {
      // 解析颜色
      const c1 = this.parseColor(color1);
      const c2 = this.parseColor(color2);
      
      // 线性插值
      const r = Math.round(c1.r + (c2.r - c1.r) * factor);
      const g = Math.round(c1.g + (c2.g - c1.g) * factor);
      const b = Math.round(c1.b + (c2.b - c1.b) * factor);
      
      // 转换回十六进制
      return `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
    } catch (e) {
      console.error('[Renderer] Color interpolation error:', e);
      return color1; // 降级方案：返回起始颜色
    }
  }
  
  /**
   * 解析十六进制颜色
   * @param {string} color - 十六进制颜色（如 '#ffffff' 或 '#fff'）
   * @returns {Object} - RGB对象 {r, g, b}
   */
  parseColor(color) {
    // 移除 # 符号
    let hex = color.replace('#', '');
    
    // 处理简写形式（如 #fff）
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }
  
  /**
   * 将数字转换为两位十六进制字符串
   * @param {number} num - 数字 (0-255)
   * @returns {string} - 两位十六进制字符串
   */
  toHex(num) {
    const hex = num.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }
  
  /**
   * 获取当前主题
   * @returns {string} - 当前主题名称
   */
  getTheme() {
    return this.theme;
  }
  
  /**
   * 检查是否正在过渡
   * @returns {boolean} - 是否正在过渡
   */
  isThemeTransitioning() {
    return this.isTransitioning;
  }
  
  /**
   * 设置消息弹窗
   * @param {Object} message - 消息对象
   * @param {string} message.type - 消息类型 ('win' 或 'gameover')
   * @param {string} message.title - 标题
   * @param {string} message.message - 消息内容
   * @param {Array} message.buttons - 按钮数组
   * 需求: 7.1, 7.2, 7.3, 7.4
   */
  setMessage(message) {
    this.message = message;
    console.log(`[Renderer] Message set: ${message.type}`);
  }
  
  /**
   * 清除消息弹窗
   */
  clearMessage() {
    this.message = null;
    console.log('[Renderer] Message cleared');
  }
  
  /**
   * 绘制消息弹窗
   * 绘制胜利或游戏结束的提示弹窗
   * 需求: 7.1, 7.2, 7.3, 7.4
   */
  drawMessage() {
    if (!this.message) {
      return;
    }
    
    try {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const boxWidth = 300;
      const boxHeight = 200;
      const boxX = centerX - boxWidth / 2;
      const boxY = centerY - boxHeight / 2;
      
      // 1. 绘制半透明背景遮罩
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 2. 绘制消息框背景
      const boxBgColor = this.getThemeColor('#fff8f0', '#3d2f1f');
      this.ctx.fillStyle = boxBgColor;
      this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      
      // 3. 绘制边框
      const borderColor = this.getThemeColor('#e8d4bc', '#5c4a2f');
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
      
      // 4. 绘制标题
      const titleColor = this.message.type === 'win' ? '#4caf50' : '#f44336';
      this.ctx.fillStyle = titleColor;
      this.ctx.font = 'bold 32px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(this.message.title, centerX, boxY + 30);
      
      // 5. 绘制消息内容
      const textColor = this.getThemeColor('#000', '#fff');
      this.ctx.fillStyle = textColor;
      this.ctx.font = '18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(this.message.message, centerX, boxY + 80);
      
      // 6. 绘制按钮
      if (this.message.buttons && this.message.buttons.length > 0) {
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 20;
        const totalButtonsWidth = this.message.buttons.length * buttonWidth + 
                                  (this.message.buttons.length - 1) * buttonSpacing;
        const buttonsStartX = centerX - totalButtonsWidth / 2;
        const buttonY = boxY + boxHeight - 60;
        
        this.message.buttons.forEach((button, index) => {
          const btnX = buttonsStartX + index * (buttonWidth + buttonSpacing);
          
          // 绘制按钮背景
          const btnBgColor = button.action === 'continue' ? '#4caf50' : '#ff9800';
          this.ctx.fillStyle = btnBgColor;
          this.ctx.fillRect(btnX, buttonY, buttonWidth, buttonHeight);
          
          // 绘制按钮文字
          this.ctx.fillStyle = '#fff';
          this.ctx.font = 'bold 16px sans-serif';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(button.text, btnX + buttonWidth / 2, buttonY + buttonHeight / 2);
        });
      }
    } catch (e) {
      console.error('[Renderer] Failed to draw message:', e);
    }
  }
  
  /**
   * 添加移动动画
   * 为方块移动创建动画效果（100毫秒过渡）
   * @param {number} fromRow - 起始行
   * @param {number} fromCol - 起始列
   * @param {number} toRow - 目标行
   * @param {number} toCol - 目标列
   * @param {number} value - 方块数值
   * 需求: 4.5, 10.1, 10.2
   */
  addMoveAnimation(fromRow, fromCol, toRow, toCol, value) {
    const animation = {
      type: 'move',
      fromRow: fromRow,
      fromCol: fromCol,
      toRow: toRow,
      toCol: toCol,
      value: value,
      startTime: Date.now(),
      duration: this.animationDuration
    };
    
    this.animations.push(animation);
    console.log(`[Renderer] Added move animation: (${fromRow},${fromCol}) -> (${toRow},${toCol})`);
  }
  
  /**
   * 添加合并动画
   * 为方块合并创建缩放动画效果
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {number} value - 合并后的数值
   * 需求: 4.5, 10.1, 10.2
   */
  addMergeAnimation(row, col, value) {
    const animation = {
      type: 'merge',
      row: row,
      col: col,
      value: value,
      startTime: Date.now(),
      duration: this.animationDuration
    };
    
    this.animations.push(animation);
    console.log(`[Renderer] Added merge animation at (${row},${col})`);
  }
  
  /**
   * 更新所有动画
   * 移除已完成的动画
   * @returns {boolean} - 是否还有活动的动画
   */
  updateAnimations() {
    const now = Date.now();
    
    // 过滤掉已完成的动画
    this.animations = this.animations.filter(anim => {
      const elapsed = now - anim.startTime;
      return elapsed < anim.duration;
    });
    
    return this.animations.length > 0;
  }
  
  /**
   * 清除所有动画
   */
  clearAnimations() {
    this.animations = [];
    console.log('[Renderer] All animations cleared');
  }
  
  /**
   * 检查是否有活动的动画
   * @returns {boolean} - 是否有动画正在播放
   */
  hasActiveAnimations() {
    return this.animations.length > 0;
  }
  
  /**
   * 绘制单个方块（支持动画）
   * 绘制方块背景、柴犬图片和数字，支持移动和缩放动画
   * 实现降级方案：图片加载失败时使用纯色方块
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {number} value - 方块数值
   * @param {number} offsetX - X轴偏移（用于移动动画）
   * @param {number} offsetY - Y轴偏移（用于移动动画）
   * @param {number} scale - 缩放比例（用于合并动画）
   * 需求: 3.3, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2
   */
  drawTileWithAnimation(row, col, value, offsetX = 0, offsetY = 0, scale = 1) {
    try {
      // 计算方块基础位置
      const baseX = this.gridStartX + col * (this.cellSize + this.cellPadding) + this.cellPadding;
      const baseY = this.gridStartY + row * (this.cellSize + this.cellPadding) + this.cellPadding;
      
      // 应用偏移
      const x = baseX + offsetX;
      const y = baseY + offsetY;
      
      // 保存当前绘图状态
      this.ctx.save();
      
      // 如果有缩放，应用缩放变换
      if (scale !== 1) {
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-centerX, -centerY);
      }
      
      // 1. 绘制方块背景
      this.ctx.fillStyle = this.getTileColor(value);
      this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
      
      // 2. 绘制柴犬图片（如果已加载）
      // 降级方案：如果图片不存在，跳过图片绘制，只显示纯色方块和数字
      if (this.images[value]) {
        try {
          const imgSize = this.cellSize * 0.5;
          const imgX = x + (this.cellSize - imgSize) / 2;
          const imgY = y + this.cellSize * 0.2;
          
          this.ctx.drawImage(this.images[value], imgX, imgY, imgSize, imgSize);
        } catch (imgError) {
          // 图片绘制失败时记录错误，但继续绘制数字
          console.error(`[Renderer] Failed to draw image for animated tile value ${value}:`, imgError);
          console.warn(`[Renderer] Using fallback (solid color only) for animated tile value ${value}`);
        }
      }
      
      // 3. 绘制数字
      this.ctx.fillStyle = value <= 4 ? '#8b6f47' : '#fff';
      this.ctx.font = `bold ${this.cellSize * 0.25}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(value, x + this.cellSize / 2, y + this.cellSize * 0.8);
      
      // 恢复绘图状态
      this.ctx.restore();
    } catch (e) {
      console.error(`[Renderer] Failed to draw animated tile at (${row}, ${col}):`, e);
    }
  }
  
  /**
   * 绘制所有方块（支持动画）
   * 遍历网格并绘制每个非空方块，应用活动的动画效果
   * @param {Array} grid - 游戏网格（4x4二维数组）
   * 需求: 4.2, 4.4, 4.5, 10.1, 10.2
   */
  drawTilesWithAnimations(grid) {
    try {
      if (!grid || !Array.isArray(grid)) {
        console.warn('[Renderer] Invalid grid provided to drawTilesWithAnimations');
        return;
      }
      
      const now = Date.now();
      
      // 创建一个集合来跟踪正在动画的方块
      const animatingTiles = new Set();
      
      // 1. 绘制所有移动动画
      this.animations.forEach(anim => {
        if (anim.type === 'move') {
          const elapsed = now - anim.startTime;
          const progress = Math.min(elapsed / anim.duration, 1);
          
          // 使用缓动函数使移动更平滑
          const eased = this.easeOutCubic(progress);
          
          // 计算当前位置偏移
          const fromX = this.gridStartX + anim.fromCol * (this.cellSize + this.cellPadding) + this.cellPadding;
          const fromY = this.gridStartY + anim.fromRow * (this.cellSize + this.cellPadding) + this.cellPadding;
          const toX = this.gridStartX + anim.toCol * (this.cellSize + this.cellPadding) + this.cellPadding;
          const toY = this.gridStartY + anim.toRow * (this.cellSize + this.cellPadding) + this.cellPadding;
          
          const offsetX = (toX - fromX) * eased;
          const offsetY = (toY - fromY) * eased;
          
          // 绘制移动中的方块
          this.drawTileWithAnimation(anim.fromRow, anim.fromCol, anim.value, offsetX, offsetY, 1);
          
          // 标记目标位置正在动画
          animatingTiles.add(`${anim.toRow},${anim.toCol}`);
        }
      });
      
      // 2. 绘制所有静态方块和合并动画
      grid.forEach((row, r) => {
        if (!Array.isArray(row)) {
          return;
        }
        
        row.forEach((cell, c) => {
          if (cell && cell.value) {
            const tileKey = `${r},${c}`;
            
            // 检查是否有合并动画
            const mergeAnim = this.animations.find(
              anim => anim.type === 'merge' && anim.row === r && anim.col === c
            );
            
            if (mergeAnim) {
              // 绘制合并动画（缩放效果）
              const elapsed = now - mergeAnim.startTime;
              const progress = Math.min(elapsed / mergeAnim.duration, 1);
              
              // 缩放动画：从1.0 -> 1.2 -> 1.0
              const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
              
              this.drawTileWithAnimation(r, c, cell.value, 0, 0, scale);
            } else if (!animatingTiles.has(tileKey)) {
              // 绘制静态方块（不在动画中）
              this.drawTile(r, c, cell.value);
            }
          }
        });
      });
      
    } catch (e) {
      console.error('[Renderer] Failed to draw tiles with animations:', e);
    }
  }
  
  /**
   * 缓动函数：ease-out cubic
   * 用于移动动画，使移动开始快，结束慢
   * @param {number} t - 进度值 (0-1)
   * @returns {number} - 缓动后的值 (0-1)
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  /**
   * 渲染完整的游戏界面
   * 协调所有绘制方法，绘制完整的游戏画面
   * @param {Array} grid - 游戏网格
   * @param {number} score - 当前分数
   * @param {number} bestScore - 最佳分数
   * @param {number} undoCount - 剩余撤销次数
   * 需求: 2.2, 5.1, 5.2, 10.1, 10.2
   */
  render(grid, score, bestScore, undoCount) {
    try {
      // 更新主题过渡动画
      this.updateThemeTransition();
      
      // 更新方块动画
      this.updateAnimations();
      
      // 1. 清空画布
      this.clearCanvas();
      
      // 2. 绘制背景
      this.drawBackground();
      
      // 3. 绘制顶部UI（分数、按钮）
      this.drawHeader(score, bestScore, undoCount);
      
      // 4. 绘制游戏网格
      this.drawGrid();
      
      // 5. 绘制方块（支持动画）
      if (this.hasActiveAnimations()) {
        this.drawTilesWithAnimations(grid);
      } else {
        this.drawTiles(grid);
      }
      
      // 6. 绘制消息弹窗（如果有）
      this.drawMessage();
      
    } catch (e) {
      console.error('[Renderer] Failed to render:', e);
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Renderer;
}
