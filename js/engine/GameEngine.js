/**
 * GameEngine - 游戏引擎
 * 负责管理游戏状态、实现核心游戏逻辑
 * 包括初始化、网格管理、方块生成等功能
 */

// 导入依赖模块
const StorageAdapter = require('../storage/StorageAdapter.js');
const Renderer = require('../renderer/Renderer.js');
const InputManager = require('../input/InputManager.js');
const AudioManager = require('../audio/AudioManager.js');

class GameEngine {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.ctx = context;
    
    // 游戏状态
    this.grid = [];
    this.score = 0;
    this.bestScore = 0;
    this.won = false;
    this.keepPlaying = false;
    this.gameHistory = [];
    this.undoCount = 5;
    this.gridSize = 4;
    
    // 创建存储适配器（首先创建，因为其他管理器需要它）
    this.storage = new StorageAdapter();
    
    // 创建管理器实例（传入storage以支持数据持久化）
    // 需求: 2.2, 3.2, 5.1, 5.2, 8.3, 8.4
    this.renderer = new Renderer(canvas, context, this.storage);
    this.inputManager = new InputManager(canvas);
    this.audioManager = new AudioManager(this.storage);
    
    // 设置Renderer的AudioManager引用，用于显示音效状态
    this.renderer.setAudioManager(this.audioManager);
    
    // 设置InputManager的回调函数连接到move方法
    // 需求: 2.2
    this.inputManager.setMoveCallback((direction) => {
      this.handleMove(direction);
    });
    
    // 设置按钮点击回调
    // 需求: 5.5, 6.3, 8.1, 7.1, 7.2, 7.3, 7.4
    this.inputManager.setButtonClickCallback((buttonType, x, y) => {
      this.handleButtonClick(buttonType, x, y);
    });
    
    console.log('[GameEngine] All managers initialized with persistent storage support');
  }
  
  /**
   * 初始化游戏
   * 重置网格、加载最佳分数、生成初始方块
   * 需求: 1.5
   */
  init() {
    console.log('[GameEngine] Initializing game...');
    
    // 加载最佳分数
    this.loadBestScore();
    
    // 重置网格
    this.resetGrid();
    
    // 生成两个初始方块
    this.addRandomTile();
    this.addRandomTile();
    
    // 渲染初始界面
    this.render();
    
    console.log('[GameEngine] Game initialized successfully');
  }
  
  /**
   * 加载最佳分数
   * 从本地存储读取历史最佳分数
   * 需求: 3.2, 3.4
   */
  loadBestScore() {
    try {
      const savedBestScore = this.storage.getItem('bestScore');
      this.bestScore = parseInt(savedBestScore) || 0;
      console.log(`[GameEngine] Best score loaded: ${this.bestScore}`);
    } catch (e) {
      console.error('[GameEngine] Failed to load best score:', e);
      this.bestScore = 0;
    }
  }
  
  /**
   * 更新当前分数
   * 增加分数并在超过最佳分数时更新最佳分数
   * 使用StorageAdapter保存最佳分数
   * 需求: 3.1, 3.4
   * @param {number} points - 要增加的分数
   */
  updateScore(points) {
    // 更新当前分数
    this.score += points;
    console.log(`[GameEngine] Score updated: +${points}, total: ${this.score}`);
    
    // 检查是否超过最佳分数
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      
      // 保存新的最佳分数到本地存储
      try {
        this.storage.setItem('bestScore', this.bestScore.toString());
        console.log(`[GameEngine] New best score saved: ${this.bestScore}`);
      } catch (e) {
        console.error('[GameEngine] Failed to save best score:', e);
      }
    }
  }
  
  /**
   * 重置网格
   * 创建一个空的4x4网格
   * 需求: 1.5, 2.5
   */
  resetGrid() {
    this.grid = [];
    
    // 创建4x4空网格
    for (let r = 0; r < this.gridSize; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        this.grid[r][c] = null;
      }
    }
    
    // 重置游戏状态
    this.score = 0;
    this.won = false;
    this.keepPlaying = false;
    this.gameHistory = [];
    this.undoCount = 5;
    
    console.log('[GameEngine] Grid reset');
  }
  
  /**
   * 随机生成方块
   * 在空白位置随机生成一个新方块
   * 90%概率生成2，10%概率生成4
   * 需求: 2.5
   */
  addRandomTile() {
    // 找到所有空白位置
    const emptyCells = [];
    
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === null) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
    
    // 如果没有空白位置，无法生成新方块
    if (emptyCells.length === 0) {
      console.log('[GameEngine] No empty cells available');
      return false;
    }
    
    // 随机选择一个空白位置
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const cell = emptyCells[randomIndex];
    
    // 90%概率生成2，10%概率生成4
    const value = Math.random() < 0.9 ? 2 : 4;
    
    // 在选定位置生成方块
    this.grid[cell.row][cell.col] = { value: value };
    
    console.log(`[GameEngine] Added random tile: value=${value} at (${cell.row}, ${cell.col})`);
    return true;
  }
  
  /**
   * 获取方向向量
   * 根据方向名称返回对应的行列偏移量
   * @param {string} direction - 方向 ('up', 'down', 'left', 'right')
   * @returns {Object} - 向量对象 {row: number, col: number}
   */
  getVector(direction) {
    const vectors = {
      'up': { row: -1, col: 0 },
      'down': { row: 1, col: 0 },
      'left': { row: 0, col: -1 },
      'right': { row: 0, col: 1 }
    };
    
    return vectors[direction] || { row: 0, col: 0 };
  }
  
  /**
   * 构建遍历顺序
   * 根据移动方向确定遍历网格的顺序
   * 确保方块从正确的方向开始移动
   * @param {Object} vector - 方向向量 {row: number, col: number}
   * @returns {Object} - 遍历顺序对象 {rows: Array, cols: Array}
   */
  buildTraversals(vector) {
    const traversals = {
      rows: [],
      cols: []
    };
    
    // 构建行遍历顺序
    for (let r = 0; r < this.gridSize; r++) {
      traversals.rows.push(r);
    }
    
    // 构建列遍历顺序
    for (let c = 0; c < this.gridSize; c++) {
      traversals.cols.push(c);
    }
    
    // 如果向下移动，从下往上遍历
    if (vector.row === 1) {
      traversals.rows.reverse();
    }
    
    // 如果向右移动，从右往左遍历
    if (vector.col === 1) {
      traversals.cols.reverse();
    }
    
    return traversals;
  }
  
  /**
   * 查找最远可移动位置
   * 从指定位置沿着给定方向查找最远的可移动位置
   * 同时返回下一个位置（用于检测合并）
   * @param {Object} cell - 起始位置 {row: number, col: number}
   * @param {Object} vector - 方向向量 {row: number, col: number}
   * @returns {Object} - 结果对象 {farthest: {row, col}, next: {row, col}}
   */
  findFarthestPosition(cell, vector) {
    let previous = cell;
    let next = { row: cell.row + vector.row, col: cell.col + vector.col };
    
    // 沿着方向向量移动，直到遇到边界或非空方块
    while (this.withinBounds(next) && this.cellAvailable(next)) {
      previous = next;
      next = { row: next.row + vector.row, col: next.col + vector.col };
    }
    
    return {
      farthest: previous,  // 最远的空白位置
      next: next           // 下一个位置（可能是边界外或已有方块）
    };
  }
  
  /**
   * 检查位置是否在网格范围内
   * @param {Object} cell - 位置 {row: number, col: number}
   * @returns {boolean} - 是否在范围内
   */
  withinBounds(cell) {
    return cell.row >= 0 && cell.row < this.gridSize &&
           cell.col >= 0 && cell.col < this.gridSize;
  }
  
  /**
   * 检查位置是否为空
   * @param {Object} cell - 位置 {row: number, col: number}
   * @returns {boolean} - 是否为空
   */
  cellAvailable(cell) {
    return this.grid[cell.row][cell.col] === null;
  }
  
  /**
   * 处理移动输入
   * 响应InputManager的移动回调，调用move方法并播放音效
   * 需求: 2.2, 5.1, 5.2
   * @param {string} direction - 移动方向 ('up', 'down', 'left', 'right')
   */
  handleMove(direction) {
    console.log(`[GameEngine] Handling move input: ${direction}`);
    
    // 调用move方法执行移动逻辑
    const moved = this.move(direction);
    
    // 如果有方块移动，播放音效
    // 需求: 5.1, 5.2
    if (moved) {
      // 检查是否有合并发生（通过分数变化判断）
      // 如果分数有变化，说明有合并，播放合并音效
      // 否则只是移动，播放移动音效
      const hasMerge = this.checkIfMergeOccurred();
      
      if (hasMerge) {
        this.audioManager.playMerge();
      } else {
        this.audioManager.playMove();
      }
    }
  }
  
  /**
   * 检查是否发生了合并
   * 通过比较当前分数和历史分数判断
   * @returns {boolean} - 是否发生了合并
   */
  checkIfMergeOccurred() {
    // 如果有历史记录，比较当前分数和上一次的分数
    if (this.gameHistory.length > 0) {
      const lastState = this.gameHistory[this.gameHistory.length - 1];
      return this.score > lastState.score;
    }
    return false;
  }
  
  /**
   * 移动方块
   * 处理上下左右四个方向的移动
   * 实现方块移动和合并逻辑，并触发动画
   * 需求: 2.2, 2.4, 2.5, 4.5, 10.1, 10.2
   * @param {string} direction - 移动方向 ('up', 'down', 'left', 'right')
   */
  move(direction) {
    console.log(`[GameEngine] Moving ${direction}`);
    
    // 清除之前的动画
    this.renderer.clearAnimations();
    
    // 在移动前保存游戏状态（用于撤销）
    this.saveGameState();
    
    // 获取方向向量
    const vector = this.getVector(direction);
    
    // 构建遍历顺序
    const traversals = this.buildTraversals(vector);
    
    // 标记是否有方块移动
    let moved = false;
    
    // 创建合并标记数组，防止同一个方块被合并多次
    const merged = [];
    for (let r = 0; r < this.gridSize; r++) {
      merged[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        merged[r][c] = false;
      }
    }
    
    // 按照遍历顺序处理每个方块
    traversals.rows.forEach(row => {
      traversals.cols.forEach(col => {
        const cell = { row: row, col: col };
        const tile = this.grid[row][col];
        
        // 如果当前位置有方块
        if (tile !== null) {
          // 查找最远可移动位置
          const positions = this.findFarthestPosition(cell, vector);
          const next = this.grid[positions.next.row]?.[positions.next.col];
          
          // 检查是否可以合并
          // 条件：下一个位置有方块 && 数值相同 && 该方块本轮未被合并过
          if (next !== null && 
              next !== undefined &&
              next.value === tile.value && 
              !merged[positions.next.row][positions.next.col]) {
            
            // 合并方块
            const mergedValue = tile.value * 2;
            this.grid[positions.next.row][positions.next.col] = { value: mergedValue };
            this.grid[row][col] = null;
            
            // 标记该位置已合并
            merged[positions.next.row][positions.next.col] = true;
            
            // 更新分数
            this.updateScore(mergedValue);
            
            // 标记有移动发生
            moved = true;
            
            // 添加移动动画（从原位置移动到合并位置）
            // 需求: 4.5, 10.1, 10.2
            this.renderer.addMoveAnimation(row, col, positions.next.row, positions.next.col, tile.value);
            
            // 添加合并动画（缩放效果）
            // 需求: 4.5, 10.1, 10.2
            this.renderer.addMergeAnimation(positions.next.row, positions.next.col, mergedValue);
            
            console.log(`[GameEngine] Merged tiles: ${tile.value} + ${tile.value} = ${mergedValue} at (${positions.next.row}, ${positions.next.col})`);
          } else {
            // 只是移动，不合并
            const farthest = positions.farthest;
            
            // 如果最远位置和当前位置不同，则移动方块
            if (farthest.row !== row || farthest.col !== col) {
              this.grid[farthest.row][farthest.col] = tile;
              this.grid[row][col] = null;
              
              // 标记有移动发生
              moved = true;
              
              // 添加移动动画
              // 需求: 4.5, 10.1, 10.2
              this.renderer.addMoveAnimation(row, col, farthest.row, farthest.col, tile.value);
              
              console.log(`[GameEngine] Moved tile from (${row}, ${col}) to (${farthest.row}, ${farthest.col})`);
            }
          }
        }
      });
    });
    
    // 如果有方块移动
    if (moved) {
      // 生成新方块
      this.addRandomTile();
      
      // 检查游戏状态（胜利或游戏结束）
      this.checkGameState();
      
      // 在状态变化时调用Renderer.render更新显示
      // 需求: 2.2, 5.1, 5.2
      this.render();
      
      console.log(`[GameEngine] Move completed. Score: ${this.score}`);
    } else {
      // 如果没有移动，移除刚才保存的状态
      this.gameHistory.pop();
      console.log('[GameEngine] No tiles moved');
    }
    
    return moved;
  }
  
  /**
   * 保存游戏状态
   * 在每次有效移动前保存当前游戏状态到历史记录
   * 限制历史记录最多保存5条
   * 需求: 6.1, 6.2
   */
  saveGameState() {
    // 深拷贝当前网格状态
    const gridCopy = [];
    for (let r = 0; r < this.gridSize; r++) {
      gridCopy[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] !== null) {
          gridCopy[r][c] = { value: this.grid[r][c].value };
        } else {
          gridCopy[r][c] = null;
        }
      }
    }
    
    // 保存游戏状态快照
    const gameState = {
      grid: gridCopy,
      score: this.score,
      won: this.won,
      keepPlaying: this.keepPlaying
    };
    
    // 添加到历史记录
    this.gameHistory.push(gameState);
    
    // 限制历史记录最多保存5条
    if (this.gameHistory.length > 5) {
      this.gameHistory.shift(); // 移除最早的记录
    }
    
    console.log(`[GameEngine] Game state saved. History length: ${this.gameHistory.length}`);
  }
  
  /**
   * 撤销上一步操作
   * 恢复到上一个保存的游戏状态
   * 需求: 6.3, 6.5
   * @returns {boolean} - 是否成功撤销
   */
  undo() {
    // 检查是否有历史记录
    if (this.gameHistory.length === 0) {
      console.log('[GameEngine] No history available for undo');
      return false;
    }
    
    // 检查是否还有撤销次数
    if (this.undoCount <= 0) {
      console.log('[GameEngine] No undo attempts remaining');
      return false;
    }
    
    // 获取上一个状态
    const previousState = this.gameHistory.pop();
    
    // 恢复网格状态
    this.grid = [];
    for (let r = 0; r < this.gridSize; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        if (previousState.grid[r][c] !== null) {
          this.grid[r][c] = { value: previousState.grid[r][c].value };
        } else {
          this.grid[r][c] = null;
        }
      }
    }
    
    // 恢复其他游戏状态
    this.score = previousState.score;
    this.won = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    
    // 减少撤销次数
    this.undoCount--;
    
    // 重新渲染
    this.render();
    
    console.log(`[GameEngine] Undo successful. Remaining undo count: ${this.undoCount}`);
    return true;
  }
  
  /**
   * 检测是否还有可移动空间
   * 检查是否还有空白位置或可合并的相邻方块
   * 需求: 2.2
   * @returns {boolean} - 是否还有可移动空间
   */
  movesAvailable() {
    // 检查是否有空白位置
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === null) {
          return true;
        }
      }
    }
    
    // 检查是否有可合并的相邻方块
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const tile = this.grid[r][c];
        
        if (tile !== null) {
          // 检查右侧
          if (c < this.gridSize - 1) {
            const right = this.grid[r][c + 1];
            if (right !== null && right.value === tile.value) {
              return true;
            }
          }
          
          // 检查下方
          if (r < this.gridSize - 1) {
            const down = this.grid[r + 1][c];
            if (down !== null && down.value === tile.value) {
              return true;
            }
          }
        }
      }
    }
    
    // 没有可移动空间
    return false;
  }
  
  /**
   * 检测是否达到2048胜利条件
   * 遍历网格查找是否有2048方块
   * 需求: 7.1
   * @returns {boolean} - 是否达到2048
   */
  hasWon() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const tile = this.grid[r][c];
        if (tile !== null && tile.value === 2048) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * 检测游戏是否结束
   * 当网格已满且无法移动时游戏结束
   * 需求: 7.3
   * @returns {boolean} - 游戏是否结束
   */
  isGameOver() {
    return !this.movesAvailable();
  }
  
  /**
   * 检查游戏状态
   * 在每次移动后检查是否胜利或游戏结束
   * 显示相应的提示信息并播放音效
   * 需求: 7.1, 7.2, 7.3, 7.4
   */
  checkGameState() {
    // 检查是否达到2048（胜利条件）
    if (!this.won && this.hasWon()) {
      this.won = true;
      console.log('[GameEngine] Player won! Reached 2048');
      
      // 播放胜利音效
      this.audioManager.playWin();
      
      // 显示胜利提示
      this.showWinMessage();
      
      return;
    }
    
    // 检查游戏是否结束
    if (this.isGameOver()) {
      console.log('[GameEngine] Game over! No more moves available');
      
      // 播放游戏结束音效
      this.audioManager.playGameOver();
      
      // 显示游戏结束提示
      this.showGameOverMessage();
      
      return;
    }
  }
  
  /**
   * 显示胜利提示弹窗
   * 在渲染器上绘制胜利消息
   * 提供"继续游戏"和"重新开始"选项
   * 需求: 7.1, 7.2
   */
  showWinMessage() {
    // 设置消息类型为胜利
    this.renderer.setMessage({
      type: 'win',
      title: '恭喜！',
      message: '你达到了 2048！',
      buttons: [
        { text: '继续游戏', action: 'continue' },
        { text: '重新开始', action: 'restart' }
      ]
    });
    
    // 重新渲染以显示消息
    this.render();
  }
  
  /**
   * 显示游戏结束提示弹窗
   * 在渲染器上绘制游戏结束消息
   * 提供"重新开始"选项
   * 需求: 7.3, 7.4
   */
  showGameOverMessage() {
    // 设置消息类型为游戏结束
    this.renderer.setMessage({
      type: 'gameover',
      title: '游戏结束',
      message: `最终分数: ${this.score}`,
      buttons: [
        { text: '重新开始', action: 'restart' }
      ]
    });
    
    // 重新渲染以显示消息
    this.render();
  }
  
  /**
   * 继续游戏
   * 在达到2048后允许玩家继续游戏
   * 需求: 7.5
   */
  continueGame() {
    console.log('[GameEngine] Player chose to keep playing');
    this.keepPlaying = true;
    
    // 清除消息弹窗
    this.renderer.clearMessage();
    
    // 重新渲染
    this.render();
  }
  
  /**
   * 重新开始游戏
   * 重置游戏状态并生成新的初始方块
   * 需求: 7.5
   */
  restart() {
    console.log('[GameEngine] Restarting game');
    
    // 清除消息弹窗
    this.renderer.clearMessage();
    
    // 重新初始化游戏
    this.init();
  }
  
  /**
   * 处理按钮点击
   * 响应InputManager的按钮点击回调
   * 实现New Game、Undo、音效切换、主题切换按钮功能
   * 以及消息弹窗按钮（继续游戏、重新开始）
   * 需求: 5.5, 6.3, 8.1, 7.1, 7.2, 7.3, 7.4
   * @param {string} buttonType - 按钮类型
   * @param {number} x - 点击X坐标
   * @param {number} y - 点击Y坐标
   */
  handleButtonClick(buttonType, x, y) {
    if (!buttonType) {
      return;
    }
    
    console.log(`[GameEngine] Button clicked: ${buttonType}`);
    
    switch (buttonType) {
      case 'new':
        // New Game 按钮：重置游戏
        console.log('[GameEngine] New Game button pressed');
        this.restart();
        break;
        
      case 'undo':
        // Undo 按钮：撤销上一步
        console.log('[GameEngine] Undo button pressed');
        this.undo();
        break;
        
      case 'sound':
        // 音效切换按钮：切换静音状态
        console.log('[GameEngine] Sound button pressed');
        const muted = this.audioManager.toggleMute();
        console.log(`[GameEngine] Sound ${muted ? 'muted' : 'unmuted'}`);
        break;
        
      case 'theme':
        // 主题切换按钮：切换深色/浅色模式
        // Renderer.setTheme 现在会自动保存主题偏好
        // 需求: 3.2, 8.1, 8.3, 8.4
        console.log('[GameEngine] Theme button pressed');
        const currentTheme = this.renderer.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.renderer.setTheme(newTheme);
        console.log(`[GameEngine] Theme changed to: ${newTheme}`);
        break;
        
      case 'continue':
        // 继续游戏按钮：在达到2048后继续游戏
        // 需求: 7.1, 7.2
        console.log('[GameEngine] Continue button pressed');
        this.continueGame();
        break;
        
      case 'restart':
        // 重新开始按钮：重置游戏
        // 需求: 7.3, 7.4
        console.log('[GameEngine] Restart button pressed');
        this.restart();
        break;
        
      default:
        console.warn(`[GameEngine] Unknown button type: ${buttonType}`);
    }
  }
  
  /**
   * 渲染游戏界面
   * 调用渲染器绘制完整的游戏界面
   * 协调渲染器绘制所有游戏元素
   * 需求: 2.2, 5.1, 5.2
   */
  render() {
    try {
      // 调用渲染器绘制完整界面
      this.renderer.render(this.grid, this.score, this.bestScore, this.undoCount);
    } catch (e) {
      console.error('[GameEngine] Failed to render:', e);
    }
  }
  
  /**
   * 游戏主循环
   * 使用requestAnimationFrame控制渲染频率
   * 确保动画流畅（至少30fps）
   * 需求: 10.1, 10.2
   */
  gameLoop() {
    try {
      // 渲染当前帧
      this.render();
      
      // 使用requestAnimationFrame请求下一帧
      // 这会自动匹配屏幕刷新率，通常是60fps
      // 即使目标是30fps，使用RAF也能确保更流畅的动画
      requestAnimationFrame(() => this.gameLoop());
    } catch (e) {
      console.error('[GameEngine] Error in game loop:', e);
      
      // 即使出错也继续循环，避免游戏卡死
      requestAnimationFrame(() => this.gameLoop());
    }
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameEngine;
}
