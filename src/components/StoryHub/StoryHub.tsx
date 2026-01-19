/**
 * 故事选择器组件
 * 展示预设故事世界卡片
 */

import { useState } from 'react';
import { getAllWorlds } from '../../services/StoryWorlds';
import type { StoryWorld } from '../../types/story';

interface StoryHubProps {
  onSelectWorld: (worldId: string, storylineId: string) => void;
}

function StoryHub({ onSelectWorld }: StoryHubProps) {
  const [selectedWorld, setSelectedWorld] = useState<StoryWorld | null>(null);
  const worlds = getAllWorlds();

  const handleWorldClick = (world: StoryWorld) => {
    setSelectedWorld(world);
  };

  const handleStartStory = (worldId: string, storylineId: string) => {
    onSelectWorld(worldId, storylineId);
  };

  const handleBack = () => {
    setSelectedWorld(null);
  };

  // 未选择故事世界时，显示所有世界
  if (!selectedWorld) {
    return (
      <div className="story-hub min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              灵魂讲述者
            </h1>
            <p className="text-xl text-purple-200">
              选择一个故事世界，开启你的互动之旅
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {worlds.map(world => (
              <WorldCard
                key={world.id}
                world={world}
                onClick={() => handleWorldClick(world)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 已选择故事世界时，显示故事线列表
  return (
    <div className="story-hub min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"
        >
          ← 返回
        </button>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            {selectedWorld.name}
          </h2>
          <p className="text-purple-200 mb-8">
            {selectedWorld.description}
          </p>

          <h3 className="text-xl font-semibold text-white mb-4">
            选择故事线
          </h3>

          <div className="space-y-4">
            {selectedWorld.storylines.map(storyline => (
              <StorylineCard
                key={storyline.id}
                storyline={storyline}
                onSelect={() => handleStartStory(selectedWorld.id, storyline.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 故事世界卡片
 */
function WorldCard({ world, onClick }: { world: StoryWorld; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="world-card bg-white/10 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-2xl group"
    >
      <div className="aspect-video bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
        {world.coverImage ? (
          <img
            src={world.coverImage}
            alt={world.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="text-6xl">📖</div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
        {world.name}
      </h3>

      <p className="text-purple-200 text-sm line-clamp-3">
        {world.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs">
          {world.context.atmosphere}
        </span>
        <span className="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs">
          {world.storylines.length} 条故事线
        </span>
      </div>
    </div>
  );
}

/**
 * 故事线卡片
 */
function StorylineCard({
  storyline,
  onSelect,
}: {
  storyline: { id: string; name: string; description: string };
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="storyline-card bg-white/5 hover:bg-white/10 rounded-xl p-6 cursor-pointer transition-all duration-300 border border-white/10 hover:border-purple-400/50"
    >
      <h4 className="text-xl font-semibold text-white mb-2">
        {storyline.name}
      </h4>
      <p className="text-purple-200 text-sm mb-4">
        {storyline.description}
      </p>
      <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg">
        开始冒险
      </button>
    </div>
  );
}

export default StoryHub;
