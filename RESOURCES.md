# Game Resources Documentation

This document describes the game resources for the WeChat Mini Game version of 2048 Shiba.

## Image Resources

All Shiba Inu images have been organized in the `images/` directory:

### Available Images

| Filename | Tile Values | Description |
|----------|-------------|-------------|
| `shiba_happy.png` | 2, 4 | Happy Shiba expression |
| `shiba_excited.png` | 8, 16 | Excited Shiba expression |
| `shiba_cool.png` | 32, 64 | Cool Shiba expression |
| `shiba_amazed.png` | 128, 256 | Amazed Shiba expression |
| `shiba_proud.png` | 512, 1024, 2048 | Proud Shiba expression |
| `shiba_mascot.png` | N/A | Game mascot/logo |

### Image Specifications

- **Format**: PNG
- **Location**: `images/` directory
- **Usage**: Referenced in `js/renderer/Renderer.js`
- **Loading**: Pre-loaded on game initialization using `canvas.createImage()`

### Image Path References

The Renderer uses the following path format:
```javascript
'images/shiba_happy.png'
'images/shiba_excited.png'
// etc.
```

## Audio Resources

Audio files should be placed in the `audio/` directory.

### Required Audio Files

| Filename | Trigger | Description |
|----------|---------|-------------|
| `move.mp3` | Tile movement | Played when tiles move |
| `merge.mp3` | Tile merge | Played when tiles merge |
| `win.mp3` | Reach 2048 | Played when player wins |
| `gameover.mp3` | Game over | Played when game ends |

### Audio Specifications

- **Format**: MP3
- **Bitrate**: 64kbps (recommended)
- **Duration**: 0.5-1.5 seconds
- **Sample Rate**: 44.1kHz
- **Location**: `audio/` directory
- **Usage**: Referenced in `js/audio/AudioManager.js`

### Audio Path References

The AudioManager uses the following path format:
```javascript
`audio/${type}.mp3`
// where type is: 'move', 'merge', 'win', or 'gameover'
```

## Resource Loading

### Images
- Loaded asynchronously on game initialization
- Uses `canvas.createImage()` API
- Implements error handling for failed loads
- Fallback: Pure color tiles if images fail to load

### Audio
- Loaded on-demand when sound effects are triggered
- Uses `wx.createInnerAudioContext()` API
- Implements error handling for playback failures
- Fallback: Silent operation if audio fails

## File Structure

```
wechat-mini-game/
├── images/
│   ├── shiba_mascot.png
│   ├── shiba_happy.png
│   ├── shiba_excited.png
│   ├── shiba_cool.png
│   ├── shiba_amazed.png
│   └── shiba_proud.png
└── audio/
    ├── move.mp3        (to be added)
    ├── merge.mp3       (to be added)
    ├── win.mp3         (to be added)
    └── gameover.mp3    (to be added)
```

## Optimization Notes

### Current Status
- ✅ Images organized in proper directory structure
- ✅ Image paths updated in Renderer.js
- ✅ Consistent naming convention applied
- ⚠️ Audio files need to be added (placeholders documented)

### Future Optimizations
- Consider converting PNG images to WebP format for smaller file size
- Compress images to reduce quality to 80% if file size is too large
- Ensure audio files are compressed to 64kbps MP3 format
- Implement lazy loading for audio resources if needed

## Requirements Satisfied

This resource organization satisfies **Requirement 4.1**:
> THE 资源加载器 SHALL 在游戏启动时预加载所有柴犬表情图片资源

All Shiba images are now properly organized and referenced for pre-loading during game initialization.
