// 模板配置
export interface Template {
  title: string;
  description: string;
  content: string;
}

// 模板列表配置
export const templateConfig: Template[] = [
  {
    title: '豪华活动回顾模板',
    description: '带样式的精美活动回顾模板',
    content: ''
  },
  {
    title: '专业比赛通知模板', 
    description: '带表格和样式的比赛通知模板',
    content: ''
  },
  {
    title: '精美会员活动邀请模板',
    description: '带卡片样式的活动邀请模板', 
    content: ''
  },
  {
    title: '正式新闻公告模板',
    description: '带官方样式的新闻公告模板',
    content: ''
  }
];

// 直接导入模板内容
import activityReview from './activity-review.html?raw';
import competitionNotice from './competition-notice.html?raw';
import memberActivity from './member-activity.html?raw';
import officialAnnouncement from './official-announcement.html?raw';

// 动态加载模板内容
export const loadTemplates = async (): Promise<Template[]> => {
  try {
    const templateContents = [
      activityReview,
      competitionNotice,
      memberActivity,
      officialAnnouncement
    ];

    return templateConfig.map((template, index) => ({
      ...template,
      content: templateContents[index] || ''
    }));
  } catch (error) {
    console.error('加载模板失败:', error);
    return templateConfig;
  }
};
