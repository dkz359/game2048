/**
 * InputManager - 输入管理器
 * 负责处理触摸事件、滑动手势识别和按钮点击检测
 */
class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.onMove = null; // 移动回调函数
    this.onButtonClick = null; // 按钮点击回调函数
    
    this.bindEvents();
  }
  
  /**
   * 绑定触摸事件监听器
   */
  bindEvents() {
    // 触摸开始事件
    wx.onTouchStart((e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
      }
    });
    
    // 触摸结束事件
    wx.onTouchEnd((e) => {
      if (e.changedTouches.length > 0) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        // 判断是滑动还是点击
        const duration = touchEndTime - this.touchStartTime;
        const distance = Math.sqrt(
          Math.pow(touchEndX - this.touchStartX, 2) + 
          Math.pow(touchEndY - this.touchStartY, 2)
        );
        
        // 如果移动距离小且时间短，视为点击
        if (distance < 10 && duration < 300) {
          this.handleButtonClick(touchEndX, touchEndY);
        } else {
          // 否则视为滑动
          this.handleSwipe(touchEndX, touchEndY);
        }
      }
    });
  }
  
  /**
   * 处理滑动手势
   * @param {number} endX - 触摸结束X坐标
   * @param {number} endY - 触摸结束Y坐标
   */
  handleSwipe(endX, endY) {
    const dx = endX - this.touchStartX;
    const dy = endY - this.touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    // 滑动阈值：最小20像素
    if (Math.max(absDx, absDy) > 20) {
      let direction;
      
      // 判断滑动方向：横向或纵向
      if (absDx > absDy) {
        // 横向滑动
        direction = dx > 0 ? 'right' : 'left';
      } else {
        // 纵向滑动
        direction = dy > 0 ? 'down' : 'up';
      }
      
      // 触发移动回调
      if (this.onMove) {
        this.onMove(direction);
      }
    }
  }
  
  /**
   * 处理按钮点击
   * 检测点击位置并识别具体按钮
   * @param {number} x - 点击X坐标
   * @param {number} y - 点击Y坐标
   */
  handleButtonClick(x, y) {
    console.log(`[InputManager] Click detected at: (${x}, ${y})`);
    
    // 识别点击的按钮类型
    const buttonType = this.detectButton(x, y);
    
    if (buttonType) {
      console.log(`[InputManager] Button detected: ${buttonType}`);
    } else {
      console.log('[InputManager] No button detected at click position');
    }
    
    // 调用按钮点击回调，传递按钮类型
    if (this.onButtonClick && buttonType) {
      this.onButtonClick(buttonType, x, y);
    }
  }
  
  /**
   * 检测按钮区域
   * 根据点击坐标判断点击了哪个按钮
   * 需求: 5.5, 6.3, 8.1
   * @param {number} x - 点击X坐标
   * @param {number} y - 点击Y坐标
   * @returns {string|null} - 按钮类型 ('new', 'undo', 'sound', 'theme', 'continue', 'restart') 或 null
   */
  detectButton(x, y) {
    try {
      // 获取屏幕信息以计算按钮位置
      const systemInfo = wx.getSystemInfoSync();
      const screenWidth = systemInfo.windowWidth;
      const screenHeight = systemInfo.windowHeight;
      
      // 计算布局参数（与Renderer中的计算保持一致）
      const horizontalPadding = 40;
      const headerHeight = 120;
      const availableWidth = screenWidth - horizontalPadding;
      const availableHeight = screenHeight - 100;
      const maxGridSize = Math.min(availableWidth, availableHeight - headerHeight);
      
      const cellPadding = screenWidth < 375 ? 10 : 12;
      const gridStartX = (screenWidth - maxGridSize) / 2;
      const gridWidth = maxGridSize;
      
      // 计算总内容高度并垂直居中
      const totalContentHeight = headerHeight + maxGridSize;
      const topOffset = (screenHeight - totalContentHeight) / 2;
      const headerY = topOffset;
      
      // 按钮参数
      const scoreBoxHeight = 60;
      const buttonWidth = 80;
      const buttonHeight = 45;
      const smallButtonSize = 50;
      const spacing = 10;
      
      console.log(`[InputManager] Button detection - gridStartX: ${gridStartX}, gridWidth: ${gridWidth}, headerY: ${headerY}`);
      
      // 第二行按钮（右侧）
      const row2Y = headerY + scoreBoxHeight + spacing + 5;
      const gridRightX2 = gridStartX + gridWidth;
      
      // 从右到左计算按钮位置
      const button4X = gridRightX2 - smallButtonSize;
      const button3X = button4X - smallButtonSize - spacing;
      const button2X = button3X - buttonWidth - spacing;
      const button1X = button2X - buttonWidth - spacing;
      
      // New 按钮（宽按钮）
      console.log(`[InputManager] New button area: (${button1X}, ${row2Y}, ${buttonWidth}, ${buttonHeight})`);
      if (this.isInRect(x, y, button1X, row2Y, buttonWidth, buttonHeight)) {
        console.log('[InputManager] New button clicked');
        return 'new';
      }
      
      // Undo 按钮（宽按钮）
      console.log(`[InputManager] Undo button area: (${button2X}, ${row2Y}, ${buttonWidth}, ${buttonHeight})`);
      if (this.isInRect(x, y, button2X, row2Y, buttonWidth, buttonHeight)) {
        console.log('[InputManager] Undo button clicked');
        return 'undo';
      }
      
      // 音效切换按钮（方形）
      console.log(`[InputManager] Sound button area: (${button3X}, ${row2Y}, ${smallButtonSize}, ${buttonHeight})`);
      if (this.isInRect(x, y, button3X, row2Y, smallButtonSize, buttonHeight)) {
        console.log('[InputManager] Sound button clicked');
        return 'sound';
      }
      
      // 主题切换按钮（方形）
      console.log(`[InputManager] Theme button area: (${button4X}, ${row2Y}, ${smallButtonSize}, ${buttonHeight})`);
      if (this.isInRect(x, y, button4X, row2Y, smallButtonSize, buttonHeight)) {
        console.log('[InputManager] Theme button clicked');
        return 'theme';
      }
      
      // 检测消息弹窗按钮（如果有）
      // 弹窗按钮位置在屏幕中央
      const centerX = screenWidth / 2;
      const centerY = systemInfo.windowHeight / 2;
      const boxWidth = 300;
      const boxHeight = 200;
      const boxY = centerY - boxHeight / 2;
      
      const msgButtonWidth = 120;
      const msgButtonHeight = 40;
      const buttonSpacing = 20;
      const messageButtonY = boxY + boxHeight - 60;
      
      // 继续游戏按钮（左侧）
      const continueButtonX = centerX - msgButtonWidth - buttonSpacing / 2;
      if (this.isInRect(x, y, continueButtonX, messageButtonY, msgButtonWidth, msgButtonHeight)) {
        console.log('[InputManager] Continue button clicked');
        return 'continue';
      }
      
      // 重新开始按钮（右侧）
      const restartButtonX = centerX + buttonSpacing / 2;
      if (this.isInRect(x, y, restartButtonX, messageButtonY, msgButtonWidth, msgButtonHeight)) {
        console.log('[InputManager] Restart button clicked');
        return 'restart';
      }
      
      return null;
    } catch (e) {
      console.error('[InputManager] Failed to detect button:', e);
      return null;
    }
  }
  
  /**
   * 检查点击是否在矩形区域内
   * @param {number} x - 点击X坐标
   * @param {number} y - 点击Y坐标
   * @param {number} rectX - 矩形X坐标
   * @param {number} rectY - 矩形Y坐标
   * @param {number} rectWidth - 矩形宽度
   * @param {number} rectHeight - 矩形高度
   * @returns {boolean} - 是否在矩形内
   */
  isInRect(x, y, rectX, rectY, rectWidth, rectHeight) {
    return x >= rectX && x <= rectX + rectWidth &&
           y >= rectY && y <= rectY + rectHeight;
  }
  
  /**
   * 设置移动回调函数
   * @param {Function} callback - 回调函数，接收direction参数
   */
  setMoveCallback(callback) {
    this.onMove = callback;
  }
  
  /**
   * 设置按钮点击回调函数
   * @param {Function} callback - 回调函数，接收x, y坐标参数
   */
  setButtonClickCallback(callback) {
    this.onButtonClick = callback;
  }
  
  /**
   * 销毁输入管理器，清理事件监听
   */
  destroy() {
    // 微信小游戏API不支持直接移除监听器
    // 可以通过设置回调为null来停止响应
    this.onMove = null;
    this.onButtonClick = null;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputManager;
}
