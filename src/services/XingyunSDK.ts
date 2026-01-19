/**
 * 魔珐星云数字人SDK封装
 * 基于官方文档 v0.1.0-alpha.95
 * https://xingyun3d.com/developers/52-183
 */

// 声明全局 XmovAvatar 类型（从CDN加载）
declare global {
  const XmovAvatar: any;
}

// ==================== 类型定义 ====================

/**
 * SDK错误码
 */
export enum EErrorCode {
  CONTAINER_NOT_FOUND = 10001,
  CONNECT_SOCKET_ERROR = 10002,
  START_SESSION_ERROR = 10003,
  STOP_SESSION_ERROR = 10004,
  VIDEO_FRAME_EXTRACT_ERROR = 20001,
  INIT_WORKER_ERROR = 20002,
  PROCESS_VIDEO_STREAM_ERROR = 20003,
  FACE_PROCESSING_ERROR = 20004,
  BACKGROUND_IMAGE_LOAD_ERROR = 30001,
  FACE_BIN_LOAD_ERROR = 30002,
  INVALID_BODY_NAME = 30003,
  VIDEO_DOWNLOAD_ERROR = 30004,
  AUDIO_DECODE_ERROR = 40001,
  FACE_DECODE_ERROR = 40002,
  VIDEO_DECODE_ERROR = 40003,
  EVENT_DECODE_ERROR = 40004,
  INVALID_DATA_STRUCTURE = 40005,
  TTSA_ERROR = 40006,
  NETWORK_DOWN = 50001,
  NETWORK_UP = 50002,
  NETWORK_RETRY = 50003,
  NETWORK_BREAK = 50004,
}

/**
 * SDK状态
 */
export enum SDKStatus {
  online = 0,
  offline = 1,
  network_on = 2,
  network_off = 3,
  close = 4,
  invisible = 5,
  visible = 6,
  stopped = 7,
}

/**
 * SDK消息
 */
export interface SDKMessage {
  code: EErrorCode;
  message: string;
  timestamp: number;
  originalError?: string;
}

/**
 * SDK网络信息
 */
export interface SDKNetworkInfo {
  rtt: number; // 延迟（毫秒）
  downlink: number; // 下载速率（MB/s）
}

/**
 * 初始化配置
 */
export interface AvatarConfig {
  containerId: string;
  appId: string;
  appSecret: string;
  gatewayServer: string;
  headers?: Record<string, string>;
  hardwareAcceleration?: 'default' | 'prefer-hardware' | 'prefer-software';
}

/**
 * 回调函数
 */
export interface AvatarCallbacks {
  onMessage?: (message: SDKMessage) => void;
  onStateChange?: (state: string) => void;
  onVoiceStateChange?: (status: 'start' | 'end') => void;
  onStatusChange?: (status: SDKStatus) => void;
  onStateRenderChange?: (state: string, duration: number) => void;
  onNetworkInfo?: (info: SDKNetworkInfo) => void;
  onWidgetEvent?: (data: any) => void;
  onStartSessionWarning?: (message: any) => void;
}

/**
 * 初始化选项
 */
export interface InitOptions {
  onDownloadProgress?: (progress: number) => void;
  initModel?: 'normal' | 'invisible';
}

/**
 * SSML动作类型
 */
export enum SSMLActionType {
  KA_INTENT = 'ka_intent',
  KA = 'ka',
}

/**
 * SSML动作数据
 */
export interface SSMLAction {
  type: SSMLActionType;
  data: {
    ka_intent?: string;
    action_semantic?: string;
  };
}

// ==================== SDK封装类 ====================

class XingyunAvatarService {
  private sdk: any = null;
  private isInitialized: boolean = false;
  private voiceState: 'start' | 'end' = 'end';

  /**
   * 等待SDK加载完成
   */
  private async waitForSDK(): Promise<void> {
    console.log('[XingyunSDK] Waiting for SDK to load...');
    return new Promise((resolve, reject) => {
      if (typeof XmovAvatar !== 'undefined') {
        console.log('[XingyunSDK] SDK already loaded');
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.error('[XingyunSDK] SDK loading timeout after 10 seconds');
        reject(new Error('SDK加载超时，请检查网络连接或刷新页面重试'));
      }, 10000);

      const checkInterval = setInterval(() => {
        if (typeof XmovAvatar !== 'undefined') {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          console.log('[XingyunSDK] SDK loaded successfully');
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 创建SDK实例
   */
  async initialize(config: AvatarConfig, callbacks: AvatarCallbacks = {}): Promise<void> {
    console.log('[XingyunSDK] Initializing SDK with config:', {
      containerId: config.containerId,
      appId: config.appId,
      appSecret: config.appSecret ? `${config.appSecret.slice(0, 4)}***${config.appSecret.slice(-4)}` : 'empty',
      gatewayServer: config.gatewayServer,
      hardwareAcceleration: config.hardwareAcceleration || 'default',
    });

    try {
      // 如果已有实例，先销毁
      if (this.sdk) {
        console.log('[XingyunSDK] Existing SDK instance found, destroying before creating new one...');
        try {
          this.sdk.destroy();
          console.log('[XingyunSDK] Old SDK instance destroyed');
        } catch (error) {
          console.warn('[XingyunSDK] Error destroying old instance:', error);
        }
        this.sdk = null;
        this.isInitialized = false;
        this.voiceState = 'end';

        // 等待一段时间，确保服务器端连接完全关闭
        console.log('[XingyunSDK] Waiting for server to clean up old connection...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[XingyunSDK] Proceeding with new connection');
      }

      await this.waitForSDK();

      console.log('[XingyunSDK] Creating XmovAvatar instance...');
      this.sdk = new XmovAvatar({
        containerId: config.containerId,
        appId: config.appId,
        appSecret: config.appSecret,
        gatewayServer: config.gatewayServer,
        headers: config.headers,
        hardwareAcceleration: config.hardwareAcceleration || 'default',
        enableLogger: true,  // 启用日志以便调试
        onMessage: (message: SDKMessage) => {
          console.log('[XingyunSDK] SDK onMessage:', message);
          // 详细记录错误信息
          if (message.code >= 40000) {
            console.error('[XingyunSDK] SDK Error (code >= 40000):', {
              code: message.code,
              message: message.message,
              timestamp: message.timestamp,
              originalError: message.originalError,
            });
          }
          callbacks.onMessage?.(message);
        },
        onStateChange: (state: string) => {
          console.log('[XingyunSDK] SDK onStateChange:', state);
          callbacks.onStateChange?.(state);
        },
        onVoiceStateChange: (status: 'start' | 'end') => {
          console.log('[XingyunSDK] SDK onVoiceStateChange:', status);
          this.voiceState = status;
          callbacks.onVoiceStateChange?.(status);
        },
        onStatusChange: (status: SDKStatus) => {
          console.log('[XingyunSDK] SDK onStatusChange:', status);
          // 详细记录状态变化
          if (status === 4) {
            console.warn('[XingyunSDK] Connection closed (status 4). Possible reasons:');
            console.warn('  1. App ID/Secret invalid or expired');
            console.warn('  2. No avatar character configured in the app');
            console.warn('  3. Account balance insufficient');
            console.warn('  4. Network issue');
          }
          callbacks.onStatusChange?.(status);
        },
        onStateRenderChange: (state: string, duration: number) => {
          console.log('[XingyunSDK] SDK onStateRenderChange:', state, duration);
          callbacks.onStateRenderChange?.(state, duration);
        },
        onNetworkInfo: (info: SDKNetworkInfo) => {
          console.log('[XingyunSDK] SDK onNetworkInfo:', info);
          callbacks.onNetworkInfo?.(info);
        },
        onWidgetEvent: (data: any) => {
          console.log('[XingyunSDK] SDK onWidgetEvent:', data);
          callbacks.onWidgetEvent?.(data);
        },
        onStartSessionWarning: (message: any) => {
          console.log('[XingyunSDK] SDK onStartSessionWarning:', message);
          callbacks.onStartSessionWarning?.(message);
        },
      });

      console.log('[XingyunSDK] XmovAvatar instance created successfully');
    } catch (error) {
      console.error('[XingyunSDK] Initialize error:', error);
      throw error;
    }
  }

  /**
   * 初始化SDK连接
   */
  async init(options: InitOptions = {}): Promise<void> {
    console.log('[XingyunSDK] Starting SDK init...');

    if (!this.sdk) {
      console.error('[XingyunSDK] SDK not initialized, call initialize() first');
      throw new Error('SDK未初始化，请先调用initialize()');
    }

    try {
      console.log('[XingyunSDK] Calling sdk.init()...');
      await this.sdk.init({
        onDownloadProgress: (progress: number) => {
          console.log(`[XingyunSDK] Download progress: ${progress}%`);
          options.onDownloadProgress?.(progress);
        },
        initModel: options.initModel || 'normal',
      });

      this.isInitialized = true;
      console.log('[XingyunSDK] SDK initialized successfully, isReady = true');
    } catch (error) {
      console.error('[XingyunSDK] Init error:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取当前语音状态
   */
  getVoiceState(): 'start' | 'end' {
    return this.voiceState;
  }

  // ==================== 状态切换方法 ====================

  /**
   * 离线模式 - 不消耗积分
   */
  offlineMode(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching to offline mode');
    this.sdk.offlineMode();
  }

  /**
   * 在线模式 - 正常工作模式
   */
  onlineMode(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching to online mode');
    this.sdk.onlineMode();
  }

  /**
   * 待机等待 - 机器未识别人脸，长时间无用户做交互
   */
  idle(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching to idle state');
    this.sdk.idle();
  }

  /**
   * 待机互动 - 交互状态切换前的循环状态
   */
  interactiveIdle(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching to interactive idle state');
    this.sdk.interactiveidle();
  }

  /**
   * 倾听 - 用户输入语音，数字人处于倾听状态
   */
  listen(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching to listen state');
    this.sdk.listen();
  }

  /**
   * 思考 - 用户提问后，未开始回复的状态
   */
  think(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching to think state');
    this.sdk.think();
  }

  // ==================== 说话方法 ====================

  /**
   * 普通说话（非流式）
   */
  speak(text: string): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] Cannot speak: SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] speak (non-streaming):', text);
    this.sdk.speak(text, true, true);
  }

  /**
   * 流式说话 - 用于大模型流式输出
   * @param text 文本内容
   * @param isStart 是否是第一句
   * @param isEnd 是否是最后一句
   */
  speakStream(text: string, isStart: boolean = false, isEnd: boolean = false): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] Cannot speak: SDK not initialized');
      return;
    }

    console.log('[XingyunSDK] speakStream:', { text, isStart, isEnd });

    // 直接调用 speak，不做额外的状态切换
    // SDK 会自动处理状态转换
    this.sdk.speak(text, isStart, isEnd);
  }

  /**
   * SSML说话 - 支持KA动作指令
   */
  speakSSML(ssml: string, isStart: boolean = true, isEnd: boolean = true): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] Cannot speak: SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] speakSSML:', { ssml, isStart, isEnd });
    this.sdk.speak(ssml, isStart, isEnd);
  }

  /**
   * 构建SSML（带KA动作指令）
   */
  buildSSML(text: string, action?: SSMLAction): string {
    if (!action) {
      return text;
    }

    const actionXml = `
      <ue4event>
        <type>${action.type}</type>
        <data>${action.type === SSMLActionType.KA_INTENT
          ? `<ka_intent>${action.data.ka_intent}</ka_intent>`
          : `<action_semantic>${action.data.action_semantic}</action_semantic>`
        }</data>
      </ue4event>
    `;

    return `<speak>${actionXml}${text}</speak>`;
  }

  // ==================== 工具方法 ====================

  /**
   * 设置音量
   * @param volume 音量值 0-1
   */
  setVolume(volume: number): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Setting volume:', volume);
    this.sdk.setVolume(volume);
  }

  /**
   * 显示调试信息
   */
  showDebugInfo(): void {
    if (!this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Showing debug info');
    this.sdk.showDebugInfo();
  }

  /**
   * 隐藏调试信息
   */
  hideDebugInfo(): void {
    if (!this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Hiding debug info');
    this.sdk.hideDebugInfo();
  }

  /**
   * 切换隐身/在线模式
   */
  switchInvisibleMode(): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Switching invisible mode');
    this.sdk.switchInvisibleMode();
  }

  /**
   * UI层面隐藏/显示数字人
   */
  changeAvatarVisible(visible: boolean): void {
    if (!this.isInitialized || !this.sdk) {
      console.warn('[XingyunSDK] SDK not initialized');
      return;
    }
    console.log('[XingyunSDK] Changing avatar visibility:', visible);
    this.sdk.changeAvatarVisible(visible);
  }

  // ==================== 销毁方法 ====================

  /**
   * 销毁SDK实例，断开所有连接
   * 根据文档：destroy() 会清理所有资源并断开连接
   */
  destroy(): void {
    console.log('[XingyunSDK] Destroying SDK instance...');
    if (this.sdk) {
      try {
        this.sdk.destroy();
        console.log('[XingyunSDK] SDK destroy() called successfully');
        // 给服务器一些时间来清理连接
        // 注意：这里我们只是标记销毁，不等待，因为这是同步方法
      } catch (error) {
        console.error('[XingyunSDK] Error during SDK destroy:', error);
      }
      this.sdk = null;
      this.isInitialized = false;
      this.voiceState = 'end';
      console.log('[XingyunSDK] SDK instance destroyed, all connections closed');
    } else {
      console.log('[XingyunSDK] No SDK instance to destroy');
    }
  }

  /**
   * 获取SDK实例（用于高级操作）
   */
  getSDK(): any {
    return this.sdk;
  }
}

export const xingyunService = new XingyunAvatarService();
