/**
 * 分析简历文本并提取关键信息
 * @param {string} text - 简历文本
 * @returns {Object} - 分析结果
 */
export const analyzeResumeText = (text) => {
  if (!text) return {
    name: '',
    title: '',
    contact: { email: '', phone: '', website: '', github: '' },
    skills: []
  };
  
  console.log('开始分析简历文本...');
  
  // 清理文本
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lines = text.split(/[\r\n]+/).map(line => line.trim()).filter(line => line);
  
  // 初始化结果对象
  const result = {
    name: '',
    title: '',
    contact: {
      email: '',
      phone: '',
      website: '',
      github: ''
    },
    skills: []
  };
  
  // 尝试提取姓名（通常是文档的第一行或第二行）
  if (lines.length > 0) {
    // 检查第一行是否看起来像姓名（短且不包含特殊字符）
    const firstLine = lines[0];
    if (firstLine.length < 30 && !/[@:\/\(\)]/.test(firstLine)) {
      result.name = firstLine;
    } else if (lines.length > 1) {
      // 尝试第二行
      const secondLine = lines[1];
      if (secondLine.length < 30 && !/[@:\/\(\)]/.test(secondLine)) {
        result.name = secondLine;
      }
    }
  }
  
  // 尝试提取职位（通常在姓名后的几行内）
  const potentialTitleLines = lines.slice(1, 5); // 检查前5行
  for (const line of potentialTitleLines) {
    // 职位通常较短，不包含特殊字符，且不是联系信息
    if (line.length < 50 && !/[@:\/\(\)]/.test(line) && !line.includes('联系') && !line.includes('电话') && !line.includes('邮箱')) {
      if (line !== result.name) { // 确保不是重复的姓名
        result.title = line;
        break;
      }
    }
  }
  
  // 提取联系信息
  // 邮箱
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    result.contact.email = emailMatches[0];
  }
  
  // 电话号码
  const phoneRegex = /(?:(?:\+|00)86)?1[3-9]\d{9}|(?:0\d{2,3}-?)?[1-9]\d{6,7}/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches && phoneMatches.length > 0) {
    result.contact.phone = phoneMatches[0];
  }
  
  // 网站
  const websiteRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/g;
  const websiteMatches = text.match(websiteRegex);
  if (websiteMatches && websiteMatches.length > 0) {
    // 排除GitHub链接
    const nonGithubLinks = websiteMatches.filter(link => !link.includes('github'));
    if (nonGithubLinks.length > 0) {
      result.contact.website = nonGithubLinks[0];
    }
  }
  
  // GitHub
  const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/g;
  const githubMatches = text.match(githubRegex);
  if (githubMatches && githubMatches.length > 0) {
    result.contact.github = 'https://' + githubMatches[0];
  }
  
  // 提取技能
  // 查找"技能"、"专业技能"、"技术栈"等部分
  const skillsSection = findSection(text, ['技能', '专业技能', '技术栈', '专业技术', 'skills', 'technical skills']);
  
  if (skillsSection) {
    // 分割技能文本并清理
    const skillLines = skillsSection.split(/[,，、;；\n]+/);
    const skills = skillLines.map(skill => skill.trim())
      .filter(skill => skill.length > 0 && skill.length < 50); // 过滤掉空行和过长的行
    
    result.skills = skills;
  } else {
    // 如果没有找到技能部分，尝试从全文中提取常见技能关键词
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'PHP', 'Ruby', 'Swift',
      'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
      'HTML', 'CSS', 'SASS', 'LESS', 'Bootstrap', 'Tailwind',
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD',
      'Git', 'SVN', 'Agile', 'Scrum', 'Jira', 'TDD', 'BDD'
    ];
    
    // 特殊处理包含特殊字符的技能
    const specialSkills = ['C++', 'C#'];
    
    // 先检查普通技能
    const foundSkills = commonSkills.filter(skill =>
      new RegExp(`\\b${skill}\\b`, 'i').test(text)
    );
    
    // 再检查特殊技能
    const foundSpecialSkills = [];
    if (text.includes('C++')) foundSpecialSkills.push('C++');
    if (text.includes('C#')) foundSpecialSkills.push('C#');
    
    // 合并结果
    result.skills = [...foundSkills, ...foundSpecialSkills];
  }
  
  console.log('简历分析完成:', result);
  return result;
};

/**
 * 在文本中查找特定部分
 * @param {string} text - 文本内容
 * @param {string[]} sectionNames - 部分名称数组
 * @returns {string} - 找到的部分文本
 */
export const findSection = (text, sectionNames) => {
  if (!text) return '';
  
  // 将文本按行分割
  const lines = text.split(/\r?\n/);
  let sectionStart = -1;
  let sectionEnd = -1;
  
  // 查找部分的开始
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();
    if (sectionNames.some(name => line.includes(name.toLowerCase()))) {
      sectionStart = i;
      break;
    }
  }
  
  if (sectionStart === -1) return ''; // 没有找到部分
  
  // 查找部分的结束（下一个看起来像标题的行）
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // 标题通常较短，可能全部大写或以冒号结尾
    if (
      (line.length < 30 && /^[A-Z\s\u4e00-\u9fa5]+$/.test(line)) || // 全大写或中文
      line.endsWith(':') || line.endsWith('：') || // 以冒号结尾
      /^[A-Z\u4e00-\u9fa5][a-z\u4e00-\u9fa5]*\s*[&\/\|]\s*[A-Z\u4e00-\u9fa5]/.test(line) // 标题格式如"Education & Experience"
    ) {
      sectionEnd = i;
      break;
    }
  }
  
  if (sectionEnd === -1) sectionEnd = lines.length; // 如果没有找到结束，使用文本末尾
  
  // 提取部分文本
  const sectionText = lines.slice(sectionStart + 1, sectionEnd).join('\n');
  
  // 清理文本（移除部分名称等）
  let cleanedText = sectionText;
  
  // 移除第一行（可能是标题）
  const sectionLines = sectionText.split(/\r?\n/);
  if (sectionLines.length > 1) {
    // 检查第一行是否包含部分名称
    const firstLine = sectionLines[0].toLowerCase();
    if (sectionNames.some(name => firstLine.includes(name.toLowerCase()))) {
      cleanedText = sectionLines.slice(1).join('\n').trim();
    }
  }
  
  return cleanedText || sectionText; // 如果清理后为空，返回原文本
};
