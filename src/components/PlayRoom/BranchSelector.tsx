/**
 * 分支选择器组件
 * 展示故事分支选项
 */

import type { StoryChoice } from '../../types/story';

interface BranchSelectorProps {
  choices: StoryChoice[];
  onSelect: (choiceId: string) => void;
  disabled?: boolean;
}

function BranchSelector({ choices, onSelect, disabled }: BranchSelectorProps) {
  return (
    <div className="branch-selector">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {choices.map((choice, index) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              index={index}
              onClick={() => onSelect(choice.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 选项卡片
 */
function ChoiceCard({
  choice,
  index,
  onClick,
  disabled,
}: {
  choice: StoryChoice;
  index: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  // 根据索引分配不同的渐变色 - 更柔和的颜色
  const gradients = [
    'from-purple-600/80 to-blue-600/80',
    'from-blue-600/80 to-cyan-600/80',
    'from-cyan-600/80 to-teal-600/80',
    'from-purple-600/80 to-pink-600/80',
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        choice-card group relative bg-gradient-to-br ${gradient}
        rounded-lg px-4 py-3 text-left
        transform transition-all duration-200
        hover:scale-102 hover:shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        shadow-md backdrop-blur-sm overflow-hidden
        flex-1 min-w-0
      `}
    >
      {/* 背景装饰 - 更轻 */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* 选项内容 */}
      <div className="relative z-10">
        {/* 选项编号和文本 */}
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium drop-shadow leading-snug">
              {choice.text}
            </p>

            {/* 后果提示 - 更紧凑 */}
            {choice.consequences && (
              <p className="text-white/70 text-xs mt-1 drop-shadow line-clamp-1">
                {choice.consequences}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 右侧箭头 - 更小更隐约 */}
      <div className="absolute bottom-2 right-2 w-4 h-4 text-white/40 group-hover:text-white/80 transition-all">
        →
      </div>
    </button>
  );
}

export default BranchSelector;
