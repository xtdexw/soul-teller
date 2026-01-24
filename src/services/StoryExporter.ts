/**
 * 故事导出服务
 * 支持将故事导出为 TXT、Markdown、JSON 格式
 */

import type {
  StoryExportData,
  ExportFormat,
  ExportResult,
  StoryPathEntry,
  VisitedNodeEntry,
  ChoiceHistoryEntry,
  InteractionSession
} from '../types/interaction';
import { getWorldById, getSceneById } from './StoryWorlds';
import type { StoryNode } from '../types/story';
import { storyEngine } from './StoryEngine';

/**
 * 故事导出服务类
 */
class StoryExporterService {
  /**
   * 收集导出数据
   */
  async collectExportData(session: InteractionSession): Promise<StoryExportData> {
    const world = getWorldById(session.worldId);
    if (!world) {
      throw new Error('故事世界不存在');
    }

    const storyline = world.storylines.find(s => s.id === session.storylineId);
    if (!storyline) {
      throw new Error('故事线不存在');
    }

    // 使用 StoryEngine 的 getStoryPath 方法获取完整故事路径
    const enginePath = storyEngine.getStoryPath();
    const storyPath: StoryPathEntry[] = enginePath.map(p => ({
      nodeId: p.nodeId,
      sceneName: p.sceneName,
      narrative: p.narrative,
      selectedChoice: p.selectedChoice,
      timestamp: p.timestamp,
    }));

    // 构建已访问节点列表
    const nodeCache = storyEngine.getNodeCache();
    const visitedNodes: VisitedNodeEntry[] = Array.from(nodeCache.values()).map(entry => ({
      node: entry.node,
      visitedAt: entry.visitedAt,
    }));

    // 构建选择历史
    const choiceHistory: ChoiceHistoryEntry[] = session.history.map((h, index) => ({
      choiceId: h.choiceId,
      choiceText: h.selectedChoice,
      fromNodeId: h.nodeId,
      toNodeId: index < session.history.length - 1 ? session.history[index + 1].nodeId : session.currentNode?.id || 'unknown',
      timestamp: h.timestamp,
    }));

    // 计算游玩时长
    const playDuration = session.lastUpdateTime - session.startTime;

    return {
      metadata: {
        exportDate: new Date().toISOString(),
        worldName: world.name,
        worldId: world.id,
        storylineName: storyline.name,
        storylineId: storyline.id,
        totalNodes: session.visitedNodes.size,
        totalChoices: session.history.length,
        playDuration,
      },
      storyPath,
      visitedNodes,
      choiceHistory,
    };
  }

  /**
   * 导出为 TXT 格式
   */
  exportToTXT(data: StoryExportData): string {
    const lines: string[] = [];

    // 标题
    lines.push('==================================================');
    lines.push('  灵魂讲述者 - 故事导出');
    lines.push('==================================================');
    lines.push('');

    // 元数据
    lines.push(`故事世界：${data.metadata.worldName}`);
    lines.push(`故事线：${data.metadata.storylineName}`);
    lines.push(`导出时间：${this.formatDate(data.metadata.exportDate)}`);
    lines.push(`总节点数：${data.metadata.totalNodes}`);
    lines.push(`总选择数：${data.metadata.totalChoices}`);
    lines.push(`游玩时长：${this.formatDuration(data.metadata.playDuration)}`);
    lines.push('');
    lines.push('==================================================');
    lines.push('');

    // 故事路径
    data.storyPath.forEach((entry, index) => {
      lines.push(`【第${index + 1}章】${entry.sceneName || '未知道场'}`);
      lines.push('');
      lines.push(entry.narrative);
      lines.push('');

      if (entry.selectedChoice) {
        lines.push(`> 你的选择：${entry.selectedChoice.text}`);
        if (entry.selectedChoice.consequences) {
          lines.push(`> 后果提示：${entry.selectedChoice.consequences}`);
        }
      }

      lines.push('');
      lines.push('--------------------------------------------------');
      lines.push('');
    });

    // 结尾
    lines.push('==================================================');
    lines.push('故事结束');
    lines.push('感谢你的游玩！');
    lines.push('==================================================');

    return lines.join('\n');
  }

  /**
   * 导出为 Markdown 格式
   */
  exportToMarkdown(data: StoryExportData): string {
    const lines: string[] = [];

    // 标题
    lines.push('# 灵魂讲述者 - 故事导出');
    lines.push('');

    // 元数据
    lines.push('## 元数据');
    lines.push('');
    lines.push('| 项目 | 内容 |');
    lines.push('|------|------|');
    lines.push(`| 故事世界 | ${data.metadata.worldName} |`);
    lines.push(`| 故事线 | ${data.metadata.storylineName} |`);
    lines.push(`| 导出时间 | ${this.formatDate(data.metadata.exportDate)} |`);
    lines.push(`| 总节点数 | ${data.metadata.totalNodes} |`);
    lines.push(`| 总选择数 | ${data.metadata.totalChoices} |`);
    lines.push(`| 游玩时长 | ${this.formatDuration(data.metadata.playDuration)} |`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // 故事路径
    lines.push('## 故事正文');
    lines.push('');

    data.storyPath.forEach((entry, index) => {
      lines.push(`### 【第${index + 1}章】${entry.sceneName || '未知道场'}`);
      lines.push('');

      if (entry.sceneName) {
        lines.push(`**场景**：${entry.sceneName}`);
        lines.push('');
      }

      lines.push(entry.narrative);
      lines.push('');

      if (entry.selectedChoice) {
        lines.push(`> **你的选择**：${entry.selectedChoice.text}`);
        if (entry.selectedChoice.consequences) {
          lines.push(`> *后果提示：${entry.selectedChoice.consequences}*`);
        }
      }

      lines.push('');
      lines.push('---');
      lines.push('');
    });

    // 结尾
    lines.push('*故事结束，感谢你的游玩！*');

    return lines.join('\n');
  }

  /**
   * 导出为 JSON 格式
   */
  exportToJSON(data: StoryExportData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出故事
   */
  async exportStory(
    session: InteractionSession,
    format: ExportFormat
  ): Promise<ExportResult> {
    // 收集数据
    const data = await this.collectExportData(session);

    // 根据格式生成内容
    let content: string;
    let extension: string;

    switch (format) {
      case 'txt':
        content = this.exportToTXT(data);
        extension = 'txt';
        break;
      case 'markdown':
        content = this.exportToMarkdown(data);
        extension = 'md';
        break;
      case 'json':
        content = this.exportToJSON(data);
        extension = 'json';
        break;
      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }

    // 生成文件名
    const filename = this.generateFilename(data.metadata.worldName, extension);

    return {
      format,
      filename,
      content,
      size: new Blob([content]).size,
    };
  }

  /**
   * 触发下载
   */
  download(result: ExportResult): void {
    const blob = new Blob([result.content], { type: this.getMimeType(result.format) });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * 导出并下载
   */
  async exportAndDownload(session: InteractionSession, format: ExportFormat): Promise<void> {
    const result = await this.exportStory(session, format);
    this.download(result);
  }

  /**
   * 生成文件名
   */
  private generateFilename(worldName: string, extension: string): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
    return `${worldName}_${dateStr}_${timeStr}.${extension}`;
  }

  /**
   * 获取 MIME 类型
   */
  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'txt':
        return 'text/plain;charset=utf-8';
      case 'markdown':
        return 'text/markdown;charset=utf-8';
      case 'json':
        return 'application/json;charset=utf-8';
      default:
        return 'text/plain;charset=utf-8';
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * 格式化时长
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }
}

export const storyExporter = new StoryExporterService();

// 导出类型供其他模块使用
export type { StoryExportData, ExportFormat, ExportResult };
