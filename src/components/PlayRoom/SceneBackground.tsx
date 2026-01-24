/**
 * 简化背景组件
 * 使用纯色渐变背景，简洁优雅
 */

interface SceneBackgroundProps {
  worldId: string | null;
  sceneId?: string | null;
  className?: string;
}

// 根据世界ID返回对应的渐变背景色
function getWorldGradient(worldId: string | null): string {
  if (!worldId) return 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)';

  const gradients: Record<string, string> = {
    'cyber-revolution': 'linear-gradient(135deg, #0a0a14 0%, #1a1a3e 50%, #0d0d1a 100%)',
    'magic-kingdom': 'linear-gradient(135deg, #0f0a1a 0%, #2e1a4e 50%, #0f0a1a 100%)',
    'mystery-detective': 'linear-gradient(135deg, #0a0f0f 0%, #1a2e2e 50%, #0a0f0f 100%)',
    'wasteland-survival': 'linear-gradient(135deg, #1a0a0a 0%, #3e1a1a 50%, #1a0a0a 100%)',
  };

  return gradients[worldId] || 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)';
}

export function SceneBackground({
  worldId,
  className = ''
}: SceneBackgroundProps) {
  const gradient = getWorldGradient(worldId);

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        zIndex: 0,
        background: gradient,
      }}
    >
      {/* 添加微妙的网格纹理 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
