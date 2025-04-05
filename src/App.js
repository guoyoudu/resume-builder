import React, { useState } from 'react';
import ResumeEditor from './components/ResumeEditor';
import ResumePreview from './components/ResumePreview';
import PdfTestPage from './components/pdf/PdfTestPage';
import './App.css';

function App() {
  const [resumeData, setResumeData] = useState({
    name: '',
    title: '',
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
  
  const [activeTemplate, setActiveTemplate] = useState('template1');
  const [activePage, setActivePage] = useState('editor'); // 添加页面状态控制

  const handleUpdateData = (data) => {
    setResumeData(data);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-indigo-600 text-white p-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">简历生成器</h1>
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <button 
                    onClick={() => setActivePage('editor')} 
                    className={`px-3 py-1 rounded ${activePage === 'editor' ? 'bg-white text-indigo-600' : 'text-white'}`}
                  >
                    简历编辑
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActivePage('pdftest')} 
                    className={`px-3 py-1 rounded ${activePage === 'pdftest' ? 'bg-white text-indigo-600' : 'text-white'}`}
                  >
                    PDF测试
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto py-6 px-4">
        {activePage === 'editor' ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">选择模板</h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTemplate('template1')}
                  className={`px-4 py-2 rounded ${
                    activeTemplate === 'template1'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  模板1 (图片样式)
                </button>
                <button
                  onClick={() => setActiveTemplate('template2')}
                  className={`px-4 py-2 rounded ${
                    activeTemplate === 'template2'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  模板2 (简洁样式)
                </button>
                <button
                  onClick={() => setActiveTemplate('template3')}
                  className={`px-4 py-2 rounded ${
                    activeTemplate === 'template3'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  模板3 (软件项目经理)
                </button>
                <button
                  onClick={() => setActiveTemplate('template4')}
                  className={`px-4 py-2 rounded ${
                    activeTemplate === 'template4'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-300'
                  }`}
                >
                  模板4 (产品经理)
                </button>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/2">
                <ResumeEditor onUpdateData={handleUpdateData} />
              </div>
              <div className="lg:w-1/2">
                <ResumePreview data={resumeData} template={activeTemplate} />
              </div>
            </div>
          </>
        ) : (
          <PdfTestPage />
        )}
      </main>
      
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="container mx-auto text-center">
          <p>© {new Date().getFullYear()} 简历生成器 - 轻松创建专业简历</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
