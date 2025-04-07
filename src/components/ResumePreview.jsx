import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ResumePreview = ({ data, template }) => {
  const resumeRef = useRef(null);

  const exportToPDF = async () => {
    if (!resumeRef.current) return;

    const element = resumeRef.current;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4纸张尺寸（mm）
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15; // 页边距
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;

    // 设置html2canvas配置
    const canvasOptions = {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    };

    try {
      // 渲染整个简历内容
      const canvas = await html2canvas(element, canvasOptions);
      
      // 计算缩放比例以适应A4纸张
      const scale = contentWidth / canvas.width;
      const scaledHeight = canvas.height * scale;
      
      // 计算需要的页数
      const totalPages = Math.ceil(scaledHeight / contentHeight);
      
      // 将内容分页添加到PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // 计算当前页的裁剪区域
        const sourceY = (i * contentHeight) / scale;
        const sourceHeight = Math.min(
          canvas.height - sourceY,
          contentHeight / scale
        );

        // 创建临时canvas用于裁剪当前页内容
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        
        // 裁剪并绘制当前页内容
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );

        // 将当前页添加到PDF
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(
          pageImgData,
          'PNG',
          margin,
          margin,
          contentWidth,
          (sourceHeight * scale)
        );
      }

      pdf.save('resume.pdf');
    } catch (error) {
      console.error('PDF导出失败:', error);
    }
  };

  // 简历模板1 - 类似于图片中的样式
  const Template1 = () => (
    <div className="flex h-full">
      {/* 左侧栏 - 个人信息和技能 */}
      <div data-side="left" className="w-1/3 bg-teal-500 text-white p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full bg-white mb-4 overflow-hidden">
            {data.avatar ? (
              <img
                src={data.avatar}
                alt="头像"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-teal-500 text-4xl font-bold">
                {data.name ? data.name.charAt(0) : ''}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-center">{data.name}</h1>
          <p className="text-center mt-2">{data.title}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b border-white pb-1">联系方式</h2>
          <ul className="space-y-2">
            {data.contact?.email && (
              <li className="flex items-center">
                <span className="mr-2">📧</span>
                <span>{data.contact.email}</span>
              </li>
            )}
            {data.contact?.phone && (
              <li className="flex items-center">
                <span className="mr-2">📱</span>
                <span>{data.contact.phone}</span>
              </li>
            )}
            {data.contact?.website && (
              <li className="flex items-center">
                <span className="mr-2">🌐</span>
                <span>{data.contact.website}</span>
              </li>
            )}
            {data.contact?.github && (
              <li className="flex items-center">
                <span className="mr-2">💻</span>
                <span>{data.contact.github}</span>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 border-b border-white pb-1">技能</h2>
          <ul className="space-y-1">
            {data.skills?.map((skill, index) => (
              <li key={index} className="flex items-center">
                <div className="w-full bg-white rounded-full h-2.5">
                  <div className="bg-teal-300 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="ml-2">{skill}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 右侧栏 - 教育、工作和项目经历 */}
      <div data-side="right" className="w-2/3 bg-white p-6">
        {data.education?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-teal-500 mb-3 border-b border-teal-500 pb-1">教育背景</h2>
            {data.education.map((edu, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-semibold">{edu.school}</h3>
                <p className="text-gray-600">{edu.degree}</p>
                <p className="text-sm text-gray-500">
                  {edu.startDate} 至 {edu.endDate || '今'}
                </p>
                <p className="mt-1">{edu.description}</p>
              </div>
            ))}
          </div>
        )}

        {data.experience?.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-teal-500 mb-3 border-b border-teal-500 pb-1">工作经验</h2>
            {data.experience.map((exp, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-semibold">{exp.position}</h3>
                <p className="text-gray-600">{exp.company}</p>
                <p className="text-sm text-gray-500">
                  {exp.startDate} 至 {exp.endDate || '今'}
                </p>
                <p className="mt-1">{exp.description}</p>
              </div>
            ))}
          </div>
        )}

        {data.projects?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-teal-500 mb-3 border-b border-teal-500 pb-1">项目经历</h2>
            {data.projects.map((project, index) => (
              <div key={index} className="mb-4">
                <h3 className="font-semibold">{project.name}</h3>
                <p className="text-gray-600">{project.technologies}</p>
                <p className="mt-1">{project.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // 简历模板2 - 更简洁的设计
  const Template2 = () => (
    <div className="bg-white p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{data.name}</h1>
        <p className="text-xl text-gray-600">{data.title}</p>
        <div className="flex justify-center space-x-4 mt-2">
          {data.contact?.email && <span>{data.contact.email}</span>}
          {data.contact?.phone && <span>{data.contact.phone}</span>}
          {data.contact?.website && <span>{data.contact.website}</span>}
        </div>
      </div>

      {data.skills?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">技能</h2>
          <div className="flex flex-wrap">
            {data.skills.map((skill, index) => (
              <span key={index} className="bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.experience?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">工作经验</h2>
          {data.experience.map((exp, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">{exp.company}</h3>
                <span className="text-sm text-gray-500">
                  {exp.startDate} - {exp.endDate || '今'}
                </span>
              </div>
              <p className="text-gray-600">{exp.position}</p>
              <p className="mt-1">{exp.description}</p>
            </div>
          ))}
        </div>
      )}

      {data.education?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">教育背景</h2>
          {data.education.map((edu, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">{edu.school}</h3>
                <span className="text-sm text-gray-500">
                  {edu.startDate} - {edu.endDate || '今'}
                </span>
              </div>
              <p className="text-gray-600">{edu.degree}</p>
              <p className="mt-1">{edu.description}</p>
            </div>
          ))}
        </div>
      )}

      {data.projects?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">项目经历</h2>
          {data.projects.map((project, index) => (
            <div key={index} className="mb-4">
              <h3 className="font-semibold">{project.name}</h3>
              <p className="text-gray-600">{project.technologies}</p>
              <p className="mt-1">{project.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 软件项目经理模板
  const Template3 = () => (
    <div className="flex h-full">
      {/* 左侧栏 - 个人信息和技能 */}
      <div data-side="left" className="w-1/3 bg-green-600 text-white p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full bg-white mb-4 overflow-hidden">
            {data.avatar ? (
              <img
                src={data.avatar}
                alt="头像"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-green-600 text-4xl font-bold">
                {data.name ? data.name.charAt(0) : ''}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-center">{data.name}</h1>
          <p className="text-center mt-2">{data.title}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b border-white pb-1">联系方式</h2>
          <ul className="space-y-2">
            {data.contact?.email && (
              <li className="flex items-center">
                <span className="mr-2">📧</span>
                <span>{data.contact.email}</span>
              </li>
            )}
            {data.contact?.phone && (
              <li className="flex items-center">
                <span className="mr-2">📱</span>
                <span>{data.contact.phone}</span>
              </li>
            )}
            {data.contact?.website && (
              <li className="flex items-center">
                <span className="mr-2">🌐</span>
                <span>{data.contact.website}</span>
              </li>
            )}
            {data.contact?.github && (
              <li className="flex items-center">
                <span className="mr-2">💻</span>
                <span>{data.contact.github}</span>
              </li>
            )}
          </ul>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 border-b border-white pb-1">个人简介</h2>
          <p className="text-sm whitespace-pre-wrap">
            {data.summary || '请在左侧编辑器添加个人简介'}
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 border-b border-white pb-1">技能</h2>
          <ul className="space-y-3">
            {data.skills?.map((skill, index) => (
              <li key={index} className="flex flex-col">
                <span className="mb-1">{skill}</span>
                <div className="w-full bg-white rounded-full h-2.5">
                  <div 
                    className="bg-green-300 h-2.5 rounded-full" 
                    style={{ width: `${95 - index * 5}%` }}
                  ></div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 右侧栏 - 项目经历、工作经验和教育背景 */}
      <div data-side="right" className="w-2/3 bg-white p-6 space-y-8">
        {data.experience?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-4 border-b border-green-600 pb-2">工作经验</h2>
            <div className="space-y-6">
              {data.experience.map((exp, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">{exp.company}</h3>
                    <span className="text-sm text-gray-500">
                      {exp.startDate} 至 {exp.endDate || '今'}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium">{exp.position}</p>
                  <p className="mt-2 text-gray-600 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.projects?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-4 border-b border-green-600 pb-2">项目经历</h2>
            <div className="space-y-6">
              {data.projects.map((project, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg text-green-700">{project.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.developmentCycle && (
                        <div className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                          开发周期：{project.developmentCycle}
                        </div>
                      )}
                      {project.projectScale && (
                        <div className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                          项目规模：{project.projectScale}
                        </div>
                      )}
                      {project.frontendTech && (
                        <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                          前端：{project.frontendTech}
                        </div>
                      )}
                      {project.backendTech && (
                        <div className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                          后端：{project.backendTech}
                        </div>
                      )}
                      {project.tools && (
                        <div className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                          工具：{project.tools}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{project.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.education?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-4 border-b border-green-600 pb-2">教育背景</h2>
            <div className="space-y-6">
              {data.education.map((edu, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">{edu.school}</h3>
                    <span className="text-sm text-gray-500">
                      {edu.startDate} 至 {edu.endDate || '今'}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium">{edu.degree}</p>
                  <p className="mt-2 text-gray-600 leading-relaxed">{edu.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.certificates?.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-green-600 mb-4 border-b border-green-600 pb-2">证书</h2>
            <div className="space-y-4">
              {data.certificates.map((cert, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h3 className="font-semibold text-lg text-green-700">{cert}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 产品经理模板
  const Template4 = () => (
    <div className="bg-white p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{data.name}</h1>
        <p className="text-xl text-gray-600">{data.title}</p>
        <div className="flex justify-center space-x-4 mt-2">
          {data.contact?.email && <span>{data.contact.email}</span>}
          {data.contact?.phone && <span>{data.contact.phone}</span>}
          {data.contact?.website && <span>{data.contact.website}</span>}
        </div>
      </div>

      {data.skills?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">技能</h2>
          <div className="flex flex-wrap">
            {data.skills.map((skill, index) => (
              <span key={index} className="bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.experience?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">工作经验</h2>
          {data.experience.map((exp, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">{exp.company}</h3>
                <span className="text-sm text-gray-500">
                  {exp.startDate} - {exp.endDate || '今'}
                </span>
              </div>
              <p className="text-gray-600">{exp.position}</p>
              <p className="mt-1">{exp.description}</p>
            </div>
          ))}
        </div>
      )}

      {data.education?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold border-b-2 border-gray-300 pb-1 mb-3">教育背景</h2>
          {data.education.map((edu, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">{edu.school}</h3>
                <span className="text-sm text-gray-500">
                  {edu.startDate} - {edu.endDate || '今'}
                </span>
              </div>
              <p className="text-gray-600">{edu.degree}</p>
              <p className="mt-1">{edu.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-end">
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          导出为PDF
        </button>
      </div>
      <div 
        ref={resumeRef} 
        className="w-full bg-white shadow-lg font-sans"
        style={{ minHeight: '297mm', width: '210mm', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}
      >
        {template === 'template1' ? <Template1 /> : 
         template === 'template2' ? <Template2 /> : 
         template === 'template3' ? <Template3 /> : 
         template === 'template4' ? <Template4 /> : 
         <Template1 />}
      </div>
    </div>
  );
};

export default ResumePreview;