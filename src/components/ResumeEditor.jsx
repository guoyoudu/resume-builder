import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from 'react-pdf';

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ResumeEditor = ({ onUpdateData }) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // 从localStorage加载保存的数据
  useEffect(() => {
    const savedData = localStorage.getItem('resumeData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(parsedData);
      onUpdateData(parsedData);
    }
  }, [onUpdateData]);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    summary: '', // 添加个人简介字段
    contact: {
      email: '',
      phone: '',
      website: '',
      github: '',
    },
    skills: [],
    education: [],
    experience: [],
    projects: [],
  });
  
  // 处理文件上传
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    setUploadError('');
    
    try {
      let extractedText = '';
      
      // 根据文件类型处理
      if (file.type === 'application/pdf') {
        extractedText = await extractTextFromPDF(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        extractedText = await extractTextFromWord(file);
      } else {
        throw new Error('不支持的文件格式，请上传Word或PDF文件');
      }
      
      // 分析提取的文本并更新表单
      if (extractedText) {
        const parsedData = analyzeResumeText(extractedText);
        updateFormWithParsedData(parsedData);
        onUpdateData(parsedData); // 更新父组件的简历数据
      }
    } catch (error) {
      console.error('处理文件时出错:', error);
      setUploadError(error.message || '处理文件时出错，请重试');
    } finally {
      setIsProcessing(false);
      // 重置文件输入，以便可以再次上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // 从PDF文件中提取文本
  const extractTextFromPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          // 添加错误处理和日志
          console.log('开始加载PDF文档...');
          
          // 使用更安全的方式创建PDF加载任务
          const loadingTask = pdfjsLib.getDocument({
            data: typedArray,
            cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
            cMapPacked: true,
          });
          
          console.log('PDF加载任务创建成功，等待文档加载...');
          const pdf = await loadingTask.promise;
          console.log(`PDF文档加载成功，共${pdf.numPages}页`);
          
          let fullText = '';
          
          // 遍历所有页面并提取文本
          for (let i = 1; i <= pdf.numPages; i++) {
            console.log(`正在处理第${i}页...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          console.log('PDF文本提取完成');
          resolve(fullText);
        } catch (error) {
          console.error('PDF处理错误:', error);
          reject(new Error(`PDF解析失败: ${error.message}`));
        }
      };
      
      fileReader.onerror = (error) => {
        console.error('文件读取错误:', error);
        reject(new Error('文件读取失败'));
      };
      
      fileReader.readAsArrayBuffer(file);
    });
  };
  
  // 从Word文件中提取文本
  const extractTextFromWord = async (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = (error) => {
        reject(error);
      };
      
      fileReader.readAsArrayBuffer(file);
    });
  };
  
  // 分析简历文本并提取关键信息
  const analyzeResumeText = (text) => {
    // 简单的信息提取逻辑，实际应用中可能需要更复杂的NLP或正则表达式
    const parsedData = {
      name: '',
      title: '',
      summary: '',
      contact: {
        email: '',
        phone: '',
        website: '',
        github: ''
      },
      skills: [],
      education: [],
      experience: [],
      projects: []
    };
    
    // 提取邮箱
    const emailRegex = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = text.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      parsedData.contact.email = emailMatches[0];
    }
    
    // 提取电话号码 (中国手机号格式)
    const phoneRegex = /(?:(?:\+|00)86)?1[3-9]\d{9}/g;
    const phoneMatches = text.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      parsedData.contact.phone = phoneMatches[0];
    }
    
    const urlRegex = /https?:\/\/(?:[\w-]+\.)+[\w-]+(?:[^\s]*)?/g;
    const urlMatches = text.match(urlRegex);
    if (urlMatches && urlMatches.length > 0) {
      // 检查是否是GitHub链接
      const githubUrl = urlMatches.find(url => url.includes('github.com'));
      if (githubUrl) {
        parsedData.contact.github = githubUrl;
      } else {
        parsedData.contact.website = urlMatches[0];
      }
    }
    
    // 分割文本为行
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // 尝试提取姓名和职位（通常在简历的开头）
    if (lines.length > 0) {
      parsedData.name = lines[0];
      if (lines.length > 1) {
        parsedData.title = lines[1];
      }
    }
    
    // 提取技能（查找常见的技能关键词段落）
    const skillsSection = findSection(text, ['技能', '专业技能', 'skills', '技术栈']);
    if (skillsSection) {
      const skillsList = skillsSection.split(/[,，、\s]+/).filter(Boolean);
      parsedData.skills = skillsList.slice(0, 10); // 限制技能数量
    }
    
    // 提取教育经历
    const educationSection = findSection(text, ['教育', '教育背景', '学历', 'education']);
    if (educationSection) {
      // 简单提取学校和学位信息
      const eduLines = educationSection.split('\n').filter(Boolean);
      if (eduLines.length >= 2) {
        parsedData.education.push({
          school: eduLines[0],
          degree: eduLines[1],
          startDate: '',
          endDate: '',
          description: eduLines.slice(2).join('\n')
        });
      }
    }
    
    // 提取工作经验
    const experienceSection = findSection(text, ['工作经验', '工作经历', '职业经历', 'experience']);
    if (experienceSection) {
      // 简单提取公司和职位信息
      const expLines = experienceSection.split('\n').filter(Boolean);
      if (expLines.length >= 2) {
        parsedData.experience.push({
          company: expLines[0],
          position: expLines[1],
          startDate: '',
          endDate: '',
          description: expLines.slice(2).join('\n')
        });
      }
    }
    
    // 提取项目经历
    const projectsSection = findSection(text, ['项目经历', '项目经验', '项目', 'projects']);
    if (projectsSection) {
      // 简单提取项目名称和描述
      const projLines = projectsSection.split('\n').filter(Boolean);
      if (projLines.length >= 1) {
        parsedData.projects.push({
          name: projLines[0],
          technologies: '',
          description: projLines.slice(1).join('\n')
        });
      }
    }
    
    // 提取个人简介
    const summarySection = findSection(text, ['个人简介', '自我介绍', '简介', 'summary', 'about me']);
    if (summarySection) {
      parsedData.summary = summarySection.split('\n')[0];
    }
    
    return parsedData;
  };
  
  // 在文本中查找特定部分
  const findSection = (text, sectionNames) => {
    const lowerText = text.toLowerCase();
    let startIndex = -1;
    let endIndex = text.length;
    
    // 查找部分的开始
    for (const name of sectionNames) {
      const index = lowerText.indexOf(name.toLowerCase());
      if (index !== -1 && (startIndex === -1 || index < startIndex)) {
        startIndex = index;
      }
    }
    
    if (startIndex === -1) return null;
    
    // 查找下一个部分的开始（作为当前部分的结束）
    const commonSections = [
      '教育', '教育背景', '学历', 
      '工作经验', '工作经历', '职业经历', 
      '项目经历', '项目经验', '项目', 
      '技能', '专业技能', '技术栈',
      '个人简介', '自我介绍', '简介'
    ];
    
    for (const name of commonSections) {
      const lowerName = name.toLowerCase();
      const index = lowerText.indexOf(lowerName, startIndex + 1);
      if (index !== -1 && index < endIndex) {
        endIndex = index;
      }
    }
    
    // 提取该部分的文本
    return text.substring(startIndex, endIndex).trim();
  };
  
  // 用解析的数据更新表单
  const updateFormWithParsedData = (parsedData) => {
    // 合并解析的数据与现有表单数据
    const updatedData = {
      ...formData,
      name: parsedData.name || formData.name,
      title: parsedData.title || formData.title,
      summary: parsedData.summary || formData.summary,
      contact: {
        ...formData.contact,
        email: parsedData.contact.email || formData.contact.email,
        phone: parsedData.contact.phone || formData.contact.phone,
        website: parsedData.contact.website || formData.contact.website,
        github: parsedData.contact.github || formData.contact.github
      }
    };
    
    // 合并技能
    if (parsedData.skills.length > 0) {
      updatedData.skills = [...parsedData.skills];
    }
    
    // 合并教育经历
    if (parsedData.education.length > 0) {
      updatedData.education = [...parsedData.education];
    }
    
    // 合并工作经验
    if (parsedData.experience.length > 0) {
      updatedData.experience = [...parsedData.experience];
    }
    
    // 合并项目经历
    if (parsedData.projects.length > 0) {
      updatedData.projects = [...parsedData.projects];
    }
    
    setFormData(updatedData);
    onUpdateData(updatedData);
  };

  const handleChange = (e, section, index, field) => {
    const { name, value } = e.target;
    let updatedData;
    
    if (section) {
      if (index !== undefined && field) {
        // 更新数组中的特定对象字段
        const newData = [...formData[section]];
        newData[index] = { ...newData[index], [field]: value };
        updatedData = { ...formData, [section]: newData };
      } else if (field) {
        // 更新嵌套对象
        updatedData = {
          ...formData,
          [section]: { ...formData[section], [field]: value },
        };
      }
    } else {
      // 更新顶层字段
      updatedData = { ...formData, [name]: value };
    }
    
    setFormData(updatedData);
    onUpdateData(updatedData); // 传递最新的数据给父组件
    localStorage.setItem('resumeData', JSON.stringify(updatedData)); // 保存到localStorage
  };

  const addItem = (section) => {
    const newItem = section === 'skills' ? '' : {};
    const updatedData = {
      ...formData,
      [section]: [...formData[section], newItem],
    };
    setFormData(updatedData);
    onUpdateData(updatedData); // 传递最新的数据给父组件
  };

  const removeItem = (section, index) => {
    const newItems = formData[section].filter((_, i) => i !== index);
    const updatedData = {
      ...formData,
      [section]: newItems,
    };
    setFormData(updatedData);
    onUpdateData(updatedData); // 传递最新的数据给父组件
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">编辑简历信息</h2>
        <button
          onClick={() => {
            const emptyData = {
              name: '',
              title: '',
              summary: '',
              contact: {
                email: '',
                phone: '',
                website: '',
                github: '',
              },
              skills: [],
              education: [],
              experience: [],
              projects: [],
            };
            setFormData(emptyData);
            onUpdateData(emptyData);
            localStorage.removeItem('resumeData');
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          清除所有数据
        </button>
      </div>
      
      {/* 文件上传区域 */}
      <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">导入现有简历</h3>
        <p className="text-sm text-gray-600 mb-3">上传Word或PDF格式的简历文件，系统将自动分析并填充表单</p>
        
        <div className="flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            id="resume-file"
          />
          <label
            htmlFor="resume-file"
            className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isProcessing}
          >
            {isProcessing ? '处理中...' : '选择文件'}
          </label>
          <span className="ml-3 text-sm text-gray-500">
            {fileInputRef.current?.files?.[0]?.name || '未选择文件'}
          </span>
        </div>
        
        {isProcessing && (
          <div className="mt-3 flex items-center text-indigo-600">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>正在分析简历内容，请稍候...</span>
          </div>
        )}
        
        {uploadError && (
          <div className="mt-3 text-red-500 text-sm">
            <span>错误: {uploadError}</span>
          </div>
        )}
      </div>
      
      {/* 基本信息 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">基本信息</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">姓名</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => handleChange(e)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">职位</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) => handleChange(e)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">个人简介</label>
          <textarea
            name="summary"
            value={formData.summary || ''}
            onChange={(e) => handleChange(e)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows="3"
            placeholder="简要介绍您的专业背景、技能和经验"
          ></textarea>
        </div>
      </div>

      {/* 联系方式 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">联系方式</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">邮箱</label>
            <input
              type="email"
              value={formData.contact.email}
              onChange={(e) => handleChange(e, 'contact', undefined, 'email')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">电话</label>
            <input
              type="tel"
              value={formData.contact.phone}
              onChange={(e) => handleChange(e, 'contact', undefined, 'phone')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">个人网站</label>
            <input
              type="url"
              value={formData.contact.website}
              onChange={(e) => handleChange(e, 'contact', undefined, 'website')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">GitHub</label>
            <input
              type="url"
              value={formData.contact.github}
              onChange={(e) => handleChange(e, 'contact', undefined, 'github')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 技能 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">技能</h3>
          <button
            type="button"
            onClick={() => addItem('skills')}
            className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            添加技能
          </button>
        </div>
        {formData.skills.map((skill, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              value={skill}
              onChange={(e) => {
                const newSkills = [...formData.skills];
                newSkills[index] = e.target.value;
                const updatedData = { ...formData, skills: newSkills };
                setFormData(updatedData);
                onUpdateData(updatedData); // 传递最新的数据给父组件
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => removeItem('skills', index)}
              className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              删除
            </button>
          </div>
        ))}
      </div>

      {/* 教育经历 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">教育经历</h3>
          <button
            type="button"
            onClick={() => addItem('education')}
            className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            添加教育经历
          </button>
        </div>
        {formData.education.map((edu, index) => (
          <div key={index} className="mb-4 p-3 border rounded">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">学校</label>
                <input
                  type="text"
                  value={edu.school || ''}
                  onChange={(e) => handleChange(e, 'education', index, 'school')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">学位</label>
                <input
                  type="text"
                  value={edu.degree || ''}
                  onChange={(e) => handleChange(e, 'education', index, 'degree')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">开始日期</label>
                <input
                  type="date"
                  value={edu.startDate || ''}
                  onChange={(e) => handleChange(e, 'education', index, 'startDate')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">结束日期</label>
                <input
                  type="date"
                  value={edu.endDate || ''}
                  onChange={(e) => handleChange(e, 'education', index, 'endDate')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">描述</label>
              <textarea
                value={edu.description || ''}
                onChange={(e) => handleChange(e, 'education', index, 'description')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows="2"
              ></textarea>
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => removeItem('education', index)}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 工作经验 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">工作经验</h3>
          <button
            type="button"
            onClick={() => addItem('experience')}
            className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            添加工作经验
          </button>
        </div>
        {formData.experience.map((exp, index) => (
          <div key={index} className="mb-4 p-3 border rounded">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">公司</label>
                <input
                  type="text"
                  value={exp.company || ''}
                  onChange={(e) => handleChange(e, 'experience', index, 'company')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">职位</label>
                <input
                  type="text"
                  value={exp.position || ''}
                  onChange={(e) => handleChange(e, 'experience', index, 'position')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">开始日期</label>
                <input
                  type="date"
                  value={exp.startDate || ''}
                  onChange={(e) => handleChange(e, 'experience', index, 'startDate')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">结束日期</label>
                <input
                  type="date"
                  value={exp.endDate || ''}
                  onChange={(e) => handleChange(e, 'experience', index, 'endDate')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">职责描述</label>
              <textarea
                value={exp.description || ''}
                onChange={(e) => handleChange(e, 'experience', index, 'description')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows="3"
              ></textarea>
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => removeItem('experience', index)}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 项目经历 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">项目经历</h3>
          <button
            type="button"
            onClick={() => addItem('projects')}
            className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            添加项目
          </button>
        </div>
        {formData.projects.map((project, index) => (
          <div key={index} className="mb-4 p-3 border rounded">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">项目名称</label>
                <input
                  type="text"
                  value={project.name || ''}
                  onChange={(e) => handleChange(e, 'projects', index, 'name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">技术栈</label>
                <input
                  type="text"
                  value={project.technologies || ''}
                  onChange={(e) => handleChange(e, 'projects', index, 'technologies')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">项目描述</label>
              <textarea
                value={project.description || ''}
                onChange={(e) => handleChange(e, 'projects', index, 'description')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows="3"
              ></textarea>
            </div>
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => removeItem('projects', index)}
                className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResumeEditor;