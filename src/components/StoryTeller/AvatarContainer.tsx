import { useEffect, useRef, useState } from 'react';
import { useAvatar } from '../../hooks/useAvatar';
import { useStore } from '../../store/useStore';
import { secureStorage } from '../../utils/secureStorage';
import type { XingyunConfig } from '../../types';

function AvatarContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef<string | null>(null);
  const { isConnected, isConnecting, connectionError, connect } = useAvatar();
  const { setAvatarContainerId } = useStore();
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  useEffect(() => {
    if (containerRef.current && !containerIdRef.current) {
      const id = `avatar-container-${Date.now()}`;
      containerIdRef.current = id;
      containerRef.current.id = id;
      setAvatarContainerId(id);
    }
  }, [setAvatarContainerId]);

  // 检测 canvas 是否创建完成
  useEffect(() => {
    if (!isConnected || !containerRef.current) {
      setIsCanvasReady(false);
      return;
    }

    let canvasDetected = false;

    const checkCanvas = () => {
      if (!containerRef.current || canvasDetected) return;

      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        canvasDetected = true;
        console.log('[AvatarContainer] Canvas detected, ready to display');
        setIsCanvasReady(true);
      }
    };

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(() => {
      checkCanvas();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    // 使用轮询作为备用方案
    const pollInterval = setInterval(() => {
      checkCanvas();
    }, 50);

    // 立即尝试检测一次
    checkCanvas();

    return () => {
      observer.disconnect();
      clearInterval(pollInterval);
    };
  }, [isConnected]);

  // 断开连接时重置 canvas 状态
  useEffect(() => {
    if (!isConnected) {
      setIsCanvasReady(false);
    }
  }, [isConnected]);

  return (
    <>
      {/* 强制覆盖 SDK canvas 和背景容器的样式 */}
      <style>{`
        #avatar-bg-container {
          display: none !important;
        }
        /* 强制 SDK canvas 居中 */
        #${containerIdRef.current} canvas {
          position: static !important;
          left: auto !important;
          top: auto !important;
          transform: none !important;
          margin: auto !important;
        }
      `}</style>

      {/* 数字人画布容器 */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: 'url(/images/back.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* 未连接提示覆盖层 */}
      {!isCanvasReady && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 10
          }}
        >
          {isConnecting ? (
            <>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: '4px solid rgb(59, 130, 246)',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }}></div>
              <p style={{ fontSize: '18px' }}>正在连接数字人...</p>
            </>
          ) : (
            <>
              <svg style={{ width: '64px', height: '64px', marginBottom: '16px', color: 'rgb(156, 163, 175)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>数字人未连接</h2>
              {connectionError && (
                <p style={{ color: 'rgb(248, 113, 113)', fontSize: '14px', marginBottom: '16px', maxWidth: '512px', textAlign: 'center' }}>
                  {connectionError}
                </p>
              )}
              <button
                onClick={async () => {
                  const config: XingyunConfig = {
                    containerId: containerIdRef.current || '',
                    appId: secureStorage.getXingyunConfig().appId,
                    appSecret: secureStorage.getXingyunConfig().appSecret,
                    gatewayServer: secureStorage.getXingyunConfig().gatewayServer,
                  };
                  await connect(config);
                }}
                disabled={isConnecting}
                style={{
                  padding: '8px 24px',
                  backgroundColor: isConnecting ? 'rgb(107, 114, 128)' : 'rgb(59, 130, 246)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isConnecting ? 'not-allowed' : 'pointer'
                }}
              >
                {isConnecting ? '连接中...' : '连接数字人'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default AvatarContainer;
