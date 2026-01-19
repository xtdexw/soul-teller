import { useAvatar } from '../../hooks/useAvatar';

interface SubtitleDisplayProps {
  className?: string;
  text?: string; // Optional text prop for direct display
}

/**
 * 字幕显示组件
 * 显示数字人正在讲述的内容
 */
function SubtitleDisplay({ className = '', text: textProp }: SubtitleDisplayProps) {
  const { subtitle } = useAvatar();

  // Use provided text prop or fall back to subtitle from useAvatar
  const displayText = textProp !== undefined ? textProp : subtitle.text;
  const isVisible = textProp !== undefined ? true : subtitle.isVisible;

  return (
    <div
      className={`subtitle-container ${className} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } transition-all duration-500 ease-out`}
    >
      {/* 字幕卡片 - 更小更透明 */}
      <div className="relative max-w-xl mx-auto px-4 py-2">
        {/* 背景效果 - 极简 */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg" />

        {/* 字幕内容 */}
        <div className="relative z-10">
          {displayText ? (
            <p className="text-sm md:text-base text-white text-center leading-snug font-normal drop-shadow-md px-2">
              {displayText}
            </p>
          ) : (
            <p className="text-xs text-white/50 text-center italic px-2">
              准备开始讲述...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubtitleDisplay;
