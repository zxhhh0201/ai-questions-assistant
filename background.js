// ============================================
// Gemini 常用问题助手 - Background Service Worker
// ============================================

// 默认数据：首次安装时写入
const DEFAULT_DATA = {
  categories: [
    { id: 'research', name: '科研', color: '#8B5CF6' },
    { id: 'writing', name: '写作', color: '#10B981' },
    { id: 'coding', name: '编程', color: '#3B82F6' },
    { id: 'general', name: '通用', color: '#F59E0B' }
  ],
  questions: [
    // 科研
    { id: 'q1', categoryId: 'research', text: '详细讲解这篇文章的方法，包括每个部分输入输出、目的、涉及到的公式', order: 0 },
    { id: 'q2', categoryId: 'research', text: '请帮我审稿，以ICML的标准，给出总结、advantage、weakness、对作者的question，各给五个，涵盖方法完整性、创新性、实验、写作等，主要聚焦方法给出。', order: 1 },
    { id: 'q3', categoryId: 'research', text: '给出这篇文章是在什么文章的基础上写出的，哪一部分参考的哪个方法', order: 2 },
    { id: 'q4', categoryId: 'research', text: '总结这篇论文的核心创新点，与现有方法相比有哪些本质区别？', order: 3 },
    { id: 'q5', categoryId: 'research', text: '分析这篇论文实验部分的设计，评估其实验是否充分验证了所提方法的有效性', order: 4 },
    // 写作
    { id: 'q6', categoryId: 'writing', text: '请帮我润色以下学术论文段落，使其更加专业和地道：', order: 0 },
    { id: 'q7', categoryId: 'writing', text: '请帮我将以下中文内容翻译成学术英文，保持专业术语准确：', order: 1 },
    { id: 'q8', categoryId: 'writing', text: '请帮我改写这段话，使其逻辑更清晰、表达更简洁：', order: 2 },
    { id: 'q9', categoryId: 'writing', text: '请帮我写一段论文的 Related Work 部分，围绕以下几篇工作展开：', order: 3 },
    { id: 'q10', categoryId: 'writing', text: '请帮我为以下内容撰写一个清晰的 Abstract，突出动机、方法和结果：', order: 4 },
    // 编程
    { id: 'q11', categoryId: 'coding', text: '请帮我审查以下代码，指出问题和改进建议：', order: 0 },
    { id: 'q12', categoryId: 'coding', text: '请用 Python 实现以下功能：', order: 1 },
    { id: 'q13', categoryId: 'coding', text: '请解释这段代码的工作原理，并逐行添加注释：', order: 2 },
    { id: 'q14', categoryId: 'coding', text: '请帮我优化这段代码的性能，并解释优化思路：', order: 3 },
    { id: 'q15', categoryId: 'coding', text: '请帮我调试以下代码，找出 bug 并给出修复方案：', order: 4 },
    // 通用
    { id: 'q16', categoryId: 'general', text: '请用简单的语言解释这个概念：', order: 0 },
    { id: 'q17', categoryId: 'general', text: '请帮我总结以下内容的要点：', order: 1 },
    { id: 'q18', categoryId: 'general', text: '请对比以下两个选项的优缺点：', order: 2 },
    { id: 'q19', categoryId: 'general', text: '请针对以下问题提供多个可行的解决方案并分析利弊：', order: 3 },
    { id: 'q20', categoryId: 'general', text: '请帮我制作一个关于以下主题的思维导图/大纲：', order: 4 }
  ]
};

// 首次安装时初始化默认数据
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set(DEFAULT_DATA, () => {
      console.log('AI 常用问题助手：默认数据已初始化');
    });
  }
});

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-questions-panel') {
    // 向当前活动标签页的 content script 发送消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-panel' });
      }
    });
  }
});
