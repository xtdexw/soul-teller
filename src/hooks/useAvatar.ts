import { useCallback, useEffect, useRef, useState } from 'react';
import {
  xingyunService,
  type AvatarCallbacks,
  type SSMLAction,
} from '../services/XingyunSDK';
import { secureStorage } from '../utils/secureStorage';
import { useStore } from '../store/useStore';
import type { XingyunConfig } from '../types';

interface SubtitleState {
  text: string;
  isVisible: boolean;
}

export function useAvatar() {
  // 使用全局 store 来管理连接状态和容器ID
  const {
    avatarConnection,
    setAvatarConnected,
    setAvatarConnecting,
    setAvatarManuallyDisconnected,
    setAvatarContainerId,
  } = useStore();

  // 本地状态：字幕和语音状态
  const [subtitle, setSubtitle] = useState<SubtitleState>({
    text: '',
    isVisible: false,
  });

  const [voiceState, setVoiceState] = useState<'start' | 'end'>('end');

  const currentSpeakTextRef = useRef<string>('');
  const hasAutoConnectedRef = useRef<boolean>(false);
  const connectionFailedRef = useRef<boolean>(false); // 跟踪连接是否失败

  // 使用 ref 来存储 containerId，避免因 containerId 变化导致 connect 函数重新创建
  const containerIdRef = useRef<string | null>(avatarConnection.containerId);
  containerIdRef.current = avatarConnection.containerId;

  /**
   * 设置容器ID（现在直接更新store）
   * @deprecated 请直接使用 setAvatarContainerId from store
   */
  const setContainerId = useCallback((id: string) => {
    console.log('[Avatar] setContainerId called (deprecated, updating store):', id);
    setAvatarContainerId(id);
  }, [setAvatarContainerId]);

  /**
   * 手动连接数字人
   */
  const connect = useCallback(async (config: XingyunConfig) => {
    const containerId = containerIdRef.current;

    console.log('[Avatar] connect called with config:', {
      appId: config.appId,
      appSecret: config.appSecret ? `${config.appSecret.slice(0, 4)}***${config.appSecret.slice(-4)}` : 'empty',
      gatewayServer: config.gatewayServer,
      containerId: containerId,
    });

    if (!containerId) {
      console.error('[Avatar] Container not initialized');
      setAvatarConnected(false, '容器未初始化');
      return;
    }

    setAvatarConnecting(true);
    console.log('[Avatar] Starting connection process...');

    try {
      const callbacks: AvatarCallbacks = {
        onMessage: (message) => {
          console.log('[Avatar] SDK onMessage:', message);
          if (message.code >= 40000) {
            console.error('[Avatar] SDK Error:', message);
            setAvatarConnected(false, message.message || '连接错误');
          }
        },
        onStateChange: (state) => {
          console.log('[Avatar] SDK onStateChange:', state);
        },
        onVoiceStateChange: (voiceStatus) => {
          console.log('[Avatar] SDK onVoiceStateChange:', voiceStatus);
          setVoiceState(voiceStatus);
          if (voiceStatus === 'start') {
            setSubtitle({
              text: currentSpeakTextRef.current,
              isVisible: true,
            });
          } else if (voiceStatus === 'end') {
            setSubtitle((prev) => ({ ...prev, isVisible: false }));
          }
        },
        onStatusChange: (status) => {
          console.log('[Avatar] SDK onStatusChange:', status);
          if (status === 4) {
            // 断开连接
            console.log('[Avatar] Disconnected (status 4)');
            connectionFailedRef.current = true;
            setAvatarConnected(false);
          }
        },
      };

      // 确保 containerId 带 # 前缀（SDK 需要 CSS 选择器格式）
      const finalContainerId = containerId.startsWith('#')
        ? containerId
        : `#${containerId}`;

      console.log('[Avatar] Using containerId:', finalContainerId);

      // config 中的 containerId 已被忽略，使用store中的容器ID
      const { containerId: _, ...configWithoutId } = config;

      // 第一步：创建SDK实例
      console.log('[Avatar] Step 1: Creating SDK instance...');
      await xingyunService.initialize(
        {
          containerId: finalContainerId,
          ...configWithoutId,
        },
        callbacks
      );
      console.log('[Avatar] Step 1 completed: SDK instance created');

      // 第二步：初始化连接
      console.log('[Avatar] Step 2: Initializing SDK connection...');
      await xingyunService.init({
        onDownloadProgress: (progress) => {
          console.log(`[Avatar] Download progress: ${progress}%`);
        },
      });
      console.log('[Avatar] Step 2 completed: SDK initialized');

      // 重置失败标志
      connectionFailedRef.current = false;

      // 等待数字人完全就绪（3D模型加载、TTS服务准备等）
      console.log('[Avatar] Waiting for avatar to be fully ready...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查连接是否仍然有效（可能在等待过程中断开）
      if (!xingyunService.isReady() || connectionFailedRef.current) {
        throw new Error('SDK 未就绪或连接已断开');
      }

      setAvatarConnected(true);
      // 连接成功后清除手动断开标志，允许后续的自动重连
      setAvatarManuallyDisconnected(false);
      console.log('[Avatar] Connection successful!');
    } catch (error) {
      console.error('[Avatar] Connect error:', error);
      console.error('[Avatar] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setAvatarConnected(false, error instanceof Error ? error.message : '连接失败');
    }
  }, [setAvatarConnected, setAvatarConnecting, setAvatarManuallyDisconnected]);

  /**
   * 手动断开数字人连接
   */
  const disconnect = useCallback(() => {
    console.log('[Avatar] Manual disconnect called');
    try {
      xingyunService.destroy();
      setAvatarConnected(false);
      setAvatarManuallyDisconnected(true); // 设置手动断开标志
      hasAutoConnectedRef.current = false;
      console.log('[Avatar] Manual disconnect completed');
    } catch (error) {
      console.error('[Avatar] Disconnect error:', error);
    }
  }, [setAvatarConnected, setAvatarManuallyDisconnected]);

  /**
   * 页面关闭时清理SDK资源
   * 只在浏览器页面关闭/刷新时执行，不在组件卸载时执行
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[Avatar] Page unloading, cleaning up SDK resources');
      try {
        xingyunService.destroy();
        hasAutoConnectedRef.current = false;
        console.log('[Avatar] SDK cleanup on page unload completed');
      } catch (error) {
        console.error('[Avatar] Cleanup error:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  /**
   * 自动连接数字人（从存储中读取配置）
   */
  const autoConnect = useCallback(async () => {
    // 防止重复自动连接
    if (hasAutoConnectedRef.current) {
      return;
    }

    const containerId = containerIdRef.current;
    if (!containerId) {
      console.log('[Avatar] autoConnect: Container ID not available yet');
      return;
    }

    const storageConfig = secureStorage.getXingyunConfig();
    const config: XingyunConfig = {
      // containerId 将从 store 中获取
      appId: storageConfig.appId,
      appSecret: storageConfig.appSecret,
      gatewayServer: storageConfig.gatewayServer,
    };

    try {
      await connect(config);
      hasAutoConnectedRef.current = true;
    } catch (error) {
      console.error('[Avatar] Auto-connect failed:', error);
    }
  }, [connect]);

  /**
   * 切换模式
   */
  const setCurrentMode = useCallback(
    (mode: 'telling' | 'dialogue' | 'branch' | null) => {
      // 模式切换可以保留在本地状态，如果需要的话
      console.log('[Avatar] Mode changed to:', mode);
    },
    []
  );

  // ==================== 说话方法 ====================

  /**
   * 普通说话（非流式）- 简短文本
   */
  const speak = useCallback((text: string) => {
    console.log('[Avatar] speak called:', text);
    currentSpeakTextRef.current = text;
    xingyunService.speak(text);
  }, []);

  /**
   * 流式说话 - 用于长文本或大模型流式输出
   */
  const speakStream = useCallback((text: string, isStart: boolean = false, isEnd: boolean = false) => {
    console.log('[Avatar] speakStream called:', { text, isStart, isEnd });
    currentSpeakTextRef.current = text;
    xingyunService.speakStream(text, isStart, isEnd);
  }, []);

  /**
   * SSML说话 - 支持KA动作指令
   */
  const speakSSML = useCallback((ssml: string, isStart: boolean = true, isEnd: boolean = true) => {
    console.log('[Avatar] speakSSML called:', { ssml, isStart, isEnd });
    xingyunService.speakSSML(ssml, isStart, isEnd);
  }, []);

  /**
   * 构建SSML并说话
   */
  const speakWithAction = useCallback((text: string, action: SSMLAction) => {
    console.log('[Avatar] speakWithAction called:', { text, action });
    const ssml = xingyunService.buildSSML(text, action);
    currentSpeakTextRef.current = text;
    xingyunService.speakSSML(ssml);
  }, []);

  // ==================== 状态切换方法 ====================

  /**
   * 离线模式 - 不消耗积分
   */
  const offlineMode = useCallback(() => {
    console.log('[Avatar] Switching to offline mode');
    xingyunService.offlineMode();
  }, []);

  /**
   * 在线模式 - 正常工作模式
   */
  const onlineMode = useCallback(() => {
    console.log('[Avatar] Switching to online mode');
    xingyunService.onlineMode();
  }, []);

  /**
   * 倾听 - 用户输入语音，数字人处于倾听状态
   */
  const listen = useCallback(() => {
    console.log('[Avatar] Switching to listen state');
    xingyunService.listen();
  }, []);

  /**
   * 思考 - 用户提问后，未开始回复的状态
   */
  const think = useCallback(() => {
    console.log('[Avatar] Switching to think state');
    xingyunService.think();
  }, []);

  /**
   * 空闲 - 机器未识别人脸，长时间无用户做交互
   */
  const idle = useCallback(() => {
    console.log('[Avatar] Switching to idle state');
    xingyunService.idle();
  }, []);

  /**
   * 交互空闲 - 交互状态切换前的循环状态
   */
  const interactiveIdle = useCallback(() => {
    console.log('[Avatar] Switching to interactive idle state');
    xingyunService.interactiveIdle();
  }, []);

  // ==================== 工具方法 ====================

  /**
   * 设置音量
   */
  const setVolume = useCallback((volume: number) => {
    console.log('[Avatar] Setting volume:', volume);
    xingyunService.setVolume(volume);
  }, []);

  /**
   * 显示调试信息
   */
  const showDebugInfo = useCallback(() => {
    console.log('[Avatar] Showing debug info');
    xingyunService.showDebugInfo();
  }, []);

  /**
   * 隐藏调试信息
   */
  const hideDebugInfo = useCallback(() => {
    console.log('[Avatar] Hiding debug info');
    xingyunService.hideDebugInfo();
  }, []);

  /**
   * 切换隐身/在线模式
   */
  const switchInvisibleMode = useCallback(() => {
    console.log('[Avatar] Switching invisible mode');
    xingyunService.switchInvisibleMode();
  }, []);

  /**
   * UI层面隐藏/显示数字人
   */
  const changeAvatarVisible = useCallback((visible: boolean) => {
    console.log('[Avatar] Changing avatar visibility:', visible);
    xingyunService.changeAvatarVisible(visible);
  }, []);

  return {
    isConnected: avatarConnection.isConnected,
    isConnecting: avatarConnection.isConnecting,
    connectionError: avatarConnection.connectionError,
    subtitle,
    voiceState,
    setContainerId,
    connect,
    disconnect,
    autoConnect,
    setCurrentMode,
    // 说话方法
    speak,
    speakStream,
    speakSSML,
    speakWithAction,
    // 状态切换
    listen,
    think,
    idle,
    interactiveIdle,
    offlineMode,
    onlineMode,
    // 工具方法
    setVolume,
    showDebugInfo,
    hideDebugInfo,
    switchInvisibleMode,
    changeAvatarVisible,
  };
}
