import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from 'react-pdf';

// 设置PDF.js worker
// 使用本地worker文件，避免网络加载问题
// 注意：项目中有两个版本的pdfjs-dist，需要分别设置worker

// 为了避免网络问题，使用相对路径加载worker文件
// 在public目录中的worker文件会在构建时被复制到输出目录
const workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

// 确保两个PDF库都使用相同的本地worker文件
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

console.log('PDF.js worker路径设置为:', workerSrc);

// 使用本地worker文件，确保在开发和生产环境都能正常工作


const ResumeEditor = ({ onUpdateData }) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    summary: '', // 添加个人简介字段
    avatar: '', // 添加头像字段
    contact: {
      email: '',
      phone: '',
      website: '',
      github: '',
    },
    skills: [],
    education: [],
    experience: [],
    projects: [], // 项目数组，每个项目包含前端技术栈、后端技术栈和工具
    certificates: [], // 证书数组，只包含证书名称
  });
  
  // 从localStorage加载保存的数据
  useEffect(() => {
    const savedData = localStorage.getItem('resumeData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(parsedData);
      // 移除这里的onUpdateData调用，避免无限循环
    }
  }, []); // 移除onUpdateData依赖

  // 添加新的useEffect来处理formData更新
  useEffect(() => {
    onUpdateData(formData);
    // 保存到localStorage
    localStorage.setItem('resumeData', JSON.stringify(formData));
  }, [formData, onUpdateData]);
  
  // 处理文件上传
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    setUploadError('');

    // 检查文件类型是否为图片
    if (e.target.name === 'avatar') {
      if (!file.type.startsWith('image/')) {
        setUploadError('请上传图片文件');
        setIsProcessing(false);
        return;
      }

      // 读取图片文件并转换为base64
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          avatar: event.target.result
        }));
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setUploadError('读取图片文件失败');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
      return;
    }
    
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
          console.log('开始加载PDF文档...', file.name, file.size);
          
          // 尝试使用更简单的配置
          const loadingTask = pdfjsLib.getDocument({
            data: typedArray,
            // 不使用cMap配置，避免可能的问题
          });
          
          console.log('PDF加载任务创建成功，等待文档加载...');
          const pdf = await loadingTask.promise;
          console.log(`PDF文档加载成功，共${pdf.numPages}页`);
          
          let fullText = '';
          
          // 遍历所有页面并提取文本 - 使用更简单的方法
          for (let i = 1; i <= pdf.numPages; i++) {
            try {
              console.log(`正在处理第${i}页...`);
              const page = await pdf.getPage(i);
              console.log(`成功获取第${i}页`);
              
              // 直接使用getTextContent而不做复杂的排序
              const textContent = await page.getTextContent();
              console.log(`成功获取第${i}页的文本内容，项目数量:`, textContent.items.length);
              
              // 输出前几个项目的详细信息以便调试
              if (textContent.items.length > 0) {
                console.log('第一个文本项目:', JSON.stringify(textContent.items[0]));
              }
              
              // 使用简单的方法合并文本
              const pageText = textContent.items.map(item => item.str).join(' ');
              console.log(`第${i}页文本长度: ${pageText.length}`);
              fullText += pageText + '\n';
            } catch (pageError) {
              console.error(`处理第${i}页时出错:`, pageError);
              // 继续处理下一页，不中断整个过程
            }
          }
          
          console.log('PDF文本提取完成，总长度:', fullText.length);
          if (fullText.length > 0) {
            console.log('提取的文本示例:', fullText.substring(0, 200));
          } else {
            console.warn('提取的文本为空!');
            // 如果提取的文本为空，添加一些测试文本
            fullText = '这是一个测试文本，因为PDF提取失败。请检查PDF文件是否正确。';
          }
          
          resolve(fullText);
        } catch (error) {
          console.error('PDF处理错误:', error);
          // 返回错误信息作为文本，而不是拒绝找理
          resolve(`PDF解析失败: ${error.message}. 请尝试不同的PDF文件。`);
        }
      };
      
      fileReader.onerror = (error) => {
        console.error('文件读取错误:', error);
        // 返回错误信息作为文本，而不是拒绝找理
        resolve('文件读取失败。请检查文件是否有效。');
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
          developmentCycle: '',
          projectScale: '',
          frontendTech: '',
          backendTech: '',
          tools: '',
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
      {/* 头像上传区域 */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">上传头像</h2>
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
            {formData.avatar ? (
              <img
                src={formData.avatar}
                alt="头像预览"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span>无头像</span>
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer inline-block"
            >
              选择图片
            </label>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">项目名称</label>
                <input
                  type="text"
                  value={project.name || ''}
                  onChange={(e) => handleChange(e, 'projects', index, 'name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">项目开发周期</label>
                  <input
                    type="text"
                    value={project.developmentCycle || ''}
                    onChange={(e) => handleChange(e, 'projects', index, 'developmentCycle')}
                    placeholder="例如：3个月"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">项目规模</label>
                  <input
                    type="text"
                    value={project.projectScale || ''}
                    onChange={(e) => handleChange(e, 'projects', index, 'projectScale')}
                    placeholder="例如：5人团队"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">前端技术栈</label>
                <input
                  type="text"
                  value={project.frontendTech || ''}
                  onChange={(e) => handleChange(e, 'projects', index, 'frontendTech')}
                  placeholder="如：React, Vue, Angular等"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">后端技术栈</label>
                <input
                  type="text"
                  value={project.backendTech || ''}
                  onChange={(e) => handleChange(e, 'projects', index, 'backendTech')}
                  placeholder="如：Node.js, Python, Java等"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">开发工具</label>
                <input
                  type="text"
                  value={project.tools || ''}
                  onChange={(e) => handleChange(e, 'projects', index, 'tools')}
                  placeholder="如：Git, Docker, VS Code等"
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

      {/* 证书编辑区域 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex justify-between items-center">
          <span>证书</span>
          <button
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                certificates: [
                  ...prev.certificates,
                  ''
                ]
              }));
            }}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            添加证书
          </button>
        </h2>

        {formData.certificates.map((cert, index) => (
          <div key={index} className="mb-4 p-4 border rounded relative">
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  certificates: prev.certificates.filter((_, i) => i !== index)
                }));
              }}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            >
              ✕
            </button>

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  证书名称
                </label>
                <input
                  type="text"
                  value={cert}
                  onChange={(e) => {
                    const newCertificates = [...formData.certificates];
                    newCertificates[index] = e.target.value;
                    setFormData(prev => ({ ...prev, certificates: newCertificates }));
                  }}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResumeEditor;