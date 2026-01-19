import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InteractionSession } from '../types/interaction';

// 数字人连接状态
interface AvatarConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  manuallyDisconnected: boolean; // 用户手动断开的标志
  containerId: string | null; // 容器ID，由 AvatarContainer 设置
}

interface AppState {
  // 会话相关
  currentSession: InteractionSession | null;
  currentWorldId: string | null;
  currentStorylineId: string | null;

  // UI状态
  isSettingsOpen: boolean;
  currentView: 'storyhub' | 'playroom' | 'settings';

  // 数字人连接状态
  avatarConnection: AvatarConnectionState;

  // Actions - 会话管理
  setCurrentSession: (session: InteractionSession | null) => void;
  setCurrentWorld: (worldId: string | null, storylineId: string | null) => void;

  // Actions - UI状态
  setSettingsOpen: (open: boolean) => void;
  setCurrentView: (view: 'storyhub' | 'playroom' | 'settings') => void;

  // Actions - 数字人连接状态
  setAvatarConnected: (isConnected: boolean, error?: string | null) => void;
  setAvatarConnecting: (isConnecting: boolean) => void;
  setAvatarManuallyDisconnected: (manuallyDisconnected: boolean) => void;
  setAvatarContainerId: (containerId: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // 初始状态
      currentSession: null,
      currentWorldId: null,
      currentStorylineId: null,
      isSettingsOpen: false,
      currentView: 'storyhub',
      avatarConnection: {
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        manuallyDisconnected: false,
        containerId: null,
      },

      // 会话管理
      setCurrentSession: (session) => set({ currentSession: session }),

      setCurrentWorld: (worldId, storylineId) =>
        set({ currentWorldId: worldId, currentStorylineId: storylineId }),

      // UI状态
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setCurrentView: (view) => set({ currentView: view }),

      // 数字人连接状态
      setAvatarConnected: (isConnected, error = null) => {
        set((state) => {
          // 只在状态真正改变时才更新
          if (state.avatarConnection.isConnected === isConnected &&
              state.avatarConnection.connectionError === error) {
            return state; // 状态未改变，不更新
          }
          return {
            avatarConnection: {
              ...state.avatarConnection,
              isConnected,
              isConnecting: false,
              connectionError: error,
              // 连接成功时保留手动断开标志，避免触发不必要的重新渲染
              manuallyDisconnected: state.avatarConnection.manuallyDisconnected,
            },
          };
        });
      },

      setAvatarConnecting: (isConnecting) => {
        set((state) => {
          if (state.avatarConnection.isConnecting === isConnecting) {
            return state;
          }
          return {
            avatarConnection: {
              ...state.avatarConnection,
              isConnecting,
            },
          };
        });
      },

      setAvatarManuallyDisconnected: (manuallyDisconnected) => {
        set((state) => {
          if (state.avatarConnection.manuallyDisconnected === manuallyDisconnected) {
            return state;
          }
          return {
            avatarConnection: {
              ...state.avatarConnection,
              manuallyDisconnected,
            },
          };
        });
      },

      setAvatarContainerId: (containerId) => {
        set((state) => {
          if (state.avatarConnection.containerId === containerId) {
            return state;
          }
          return {
            avatarConnection: {
              ...state.avatarConnection,
              containerId,
            },
          };
        });
      },
    }),
    {
      name: 'soul-teller-ui-storage',
      version: 2, // 版本号：如果结构变化，增加此号会自动清除旧数据
      partialize: (state) => ({
        // 只持久化必要的 UI 状态
        currentView: state.currentView,
        isSettingsOpen: state.isSettingsOpen,
        // 不持久化会话状态和数字人连接状态
      }),
      migrate: (persistedState: any, version: number) => {
        // 数据迁移逻辑
        console.log('[Store] Migrating from version', version, 'to version 2');

        // 如果是旧版本，重置为 storyhub 避免状态不一致
        if (version < 2) {
          return {
            ...persistedState,
            currentView: 'storyhub', // 重置为有效值
            isSettingsOpen: false,
          };
        }

        return persistedState;
      },
    }
  )
);
