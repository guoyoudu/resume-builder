import React, { useState, useRef, useEffect } from 'react';
import PdfUploader from './PdfUploader';
import PdfPreview from './PdfPreview';
import PdfTextDisplay from './PdfTextDisplay';
import ParsedDataDisplay from './ParsedDataDisplay';
import { getPdfPageCount, generatePdfPreview, extractTextFromPDF } from './PdfTextExtractor';
import { createOcrWorker, processWithOcr } from './OcrProcessor';
import { analyzeResumeText } from './TextAnalyzer';

/**
 * PDF测试页面组件
 * 整合PDF上传、预览、文本提取和分析功能
 */
const PdfTestPage = () => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showAllText, setShowAllText] = useState(false);
  const [pdfInfo, setPdfInfo] = useState({
    fileName: '',
    previewUrls: [],
    currentPage: 1,
    pageCount: 0,
    extractedText: '',
    textByPage: [],
    parsedData: null,
    processingTime: 0,
    textExtractionSuccess: false,
    hasImages: false,
    ocrProcessing: false,
    ocrProgress: 0,
    ocrComplete: false
  });
  
  // 创建Tesseract OCR Worker
  const [ocrWorker, setOcrWorker] = useState(null);
  
  // 初始化OCR Worker
  useEffect(() => {
    let isMounted = true; // 防止组件卸载后设置状态
    
    const initWorker = async () => {
      try {
        console.log('开始初始化OCR Worker...');
        
        // 创建OCR Worker，传递进度回调函数
        const worker = await createOcrWorker((progress) => {
          if (isMounted) {
            setPdfInfo(prev => ({
              ...prev,
              ocrProgress: progress
            }));
          }
        });
        
        if (isMounted) {
          console.log('OCR Worker初始化成功');
          setOcrWorker(worker);
        } else {
          // 如果组件已卸载，则终止worker
          worker.terminate();
        }
      } catch (error) {
        console.error('初始化OCR Worker失败:', error);
      }
    };
    
    initWorker();
    
    // 组件卸载时终止Worker并清理
    return () => {
      isMounted = false;
      if (ocrWorker) {
        console.log('组件卸载，终止OCR Worker');
        ocrWorker.terminate();
      }
    };
  }, []); // 空依赖数组，只在组件挂载时运行一次
  
  // 切换预览页面
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pdfInfo.pageCount) {
      setPdfInfo(prev => ({
        ...prev,
        currentPage: newPage
      }));
    }
  };
  
  // 切换文本显示模式
  const toggleTextDisplayMode = (showAll) => {
    setShowAllText(showAll);
  };
  
  // 处理文件上传
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('选择了文件:', file.name, file.type, file.size);
    
    if (file.type !== 'application/pdf') {
      setUploadError('请上传PDF文件');
      return;
    }
    
    setIsProcessing(true);
    setUploadError('');
    
    // 重置状态
    setPdfInfo({
      fileName: file.name,
      previewUrls: [],
      currentPage: 1,
      pageCount: 0,
      extractedText: '',
      textByPage: [],
      parsedData: null,
      processingTime: 0,
      textExtractionSuccess: false,
      hasImages: false,
      ocrProcessing: false,
      ocrProgress: 0,
      ocrComplete: false
    });
    
    try {
      // 生成PDF预览
      const previewUrls = await generatePdfPreview(file);
      console.log('生成预览图成功，数量:', previewUrls.length);
      
      // 更新状态并等待状态更新完成
      setPdfInfo(prev => ({
        ...prev,
        previewUrls,
        pageCount: previewUrls.length
      }));
      
      // 提取文本
      const startTime = performance.now();
      const extractionResult = await extractTextFromPDF(file);
      
      const extractedText = extractionResult.fullText;
      const textByPage = Array.isArray(extractionResult.textByPage) ? extractionResult.textByPage : [];
      const textExtractionSuccess = extractionResult.success;
      const needsOcr = extractionResult.needsOcr;
      
      // 如果提取失败且需要OCR，尝试OCR处理
      if (!textExtractionSuccess && needsOcr) {
        console.log('检查OCR Worker状态...');
        
        if (!ocrWorker) {
          console.warn('OCR Worker尚未准备好，尝试初始化...');
          try {
            // 创建OCR Worker，传递进度回调函数
            const worker = await createOcrWorker((progress) => {
              setPdfInfo(prev => ({
                ...prev,
                ocrProgress: progress
              }));
            });
            setOcrWorker(worker);
            console.log('实时初始化OCR Worker成功');
          } catch (initError) {
            console.error('OCR Worker实时初始化失败:', initError);
            setUploadError('初始化OCR处理失败，请刷新页面后重试');
            setPdfInfo(prev => ({
              ...prev,
              ocrProcessing: false,
              ocrComplete: true
            }));
            return;
          }
        }
        
        console.log('开始使用OCR处理PDF...');
        setPdfInfo(prev => ({
          ...prev,
          ocrProcessing: true,
          ocrProgress: 0
        }));
        
        try {
          // 使用最新的previewUrls变量，而不是使用pdfInfo中的值
          if (previewUrls && Array.isArray(previewUrls) && previewUrls.length > 0) {
            // 使用OCR处理预览图
            console.log('开始处理预览图，数量:', previewUrls.length);
            
            // 注意：这里我们不传递回调函数，因为我们已经在worker创建时设置了进度回调
            const ocrResult = await processWithOcr(
              ocrWorker, 
              previewUrls // 使用最新的previewUrls变量
            );
            
            // 分析OCR提取的文本
            let ocrParsedData = null;
            if (ocrResult.success) {
              ocrParsedData = analyzeResumeText(ocrResult.fullText);
            }
            
            // 确保textByPage始终是数组
            const textByPageArray = Array.isArray(ocrResult.textByPage) ? ocrResult.textByPage : [ocrResult.fullText];
            
            // 更新状态
            setPdfInfo(prev => ({
              ...prev,
              extractedText: ocrResult.fullText,
              textByPage: textByPageArray,
              textExtractionSuccess: ocrResult.success,
              parsedData: ocrParsedData,
              ocrProcessing: false,
              ocrComplete: true
            }));
          } else {
            console.error('没有可用的预览图进行OCR处理');
          }
        } catch (error) {
          console.error('OCR处理失败:', error);
          setPdfInfo(prev => ({
            ...prev,
            ocrProcessing: false,
            ocrComplete: true
          }));
        }
      } else {
        // 分析提取的文本
        let parsedData = null;
        if (textExtractionSuccess) {
          parsedData = analyzeResumeText(extractedText);
        }
        
        // 设置最终的处理结果
        const endTime = performance.now();
        const processingTime = ((endTime - startTime) / 1000).toFixed(2);
        
        setPdfInfo(prev => ({
          ...prev,
          extractedText: extractedText,
          textByPage: textByPage,
          parsedData: parsedData,
          processingTime,
          textExtractionSuccess: textExtractionSuccess,
          hasImages: extractionResult.hasImages,
          pageCount: prev.previewUrls.length || prev.pageCount
        }));
        
        // 如果提取的文本很少，显示警告
        if (extractedText.length < 100) {
          setUploadError('警告: 提取的文本内容很少，可能是扫描的PDF或加密的PDF。');
        }
      }
    } catch (error) {
      console.error('处理PDF文件时出错:', error);
      setUploadError(error.message || '处理PDF文件时出错，请重试');
      
      setPdfInfo(prev => ({
        ...prev,
        extractedText: `错误: ${error.message || '处理PDF文件时出错'}`
      }));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">PDF简历解析测试</h2>
      
      {/* 文件上传区域 */}
      <PdfUploader 
        onFileUpload={handleFileUpload}
        isProcessing={isProcessing}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
      />
      
      {/* PDF预览区域 */}
      {pdfInfo.fileName && pdfInfo.previewUrls.length > 0 && (
        <PdfPreview 
          previewUrls={pdfInfo.previewUrls}
          currentPage={pdfInfo.currentPage}
          pageCount={pdfInfo.pageCount}
          onPageChange={changePage}
        />
      )}
      
      {/* 解析结果显示区域 */}
      {pdfInfo.fileName && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">基本信息</h3>
            <p>文件名：{pdfInfo.fileName}</p>
            <p>页数：{pdfInfo.pageCount}</p>
            <p>处理时间：{pdfInfo.processingTime}秒</p>
          </div>
          
          {/* 结构化数据显示 */}
          {pdfInfo.parsedData && (
            <ParsedDataDisplay parsedData={pdfInfo.parsedData} />
          )}
          
          {/* 原始文本显示区域 */}
          <PdfTextDisplay 
            extractedText={pdfInfo.extractedText}
            textByPage={pdfInfo.textByPage}
            currentPage={pdfInfo.currentPage}
            textExtractionSuccess={pdfInfo.textExtractionSuccess}
            showAllText={showAllText}
            onToggleDisplayMode={toggleTextDisplayMode}
            ocrProcessing={pdfInfo.ocrProcessing}
            ocrProgress={pdfInfo.ocrProgress}
            ocrComplete={pdfInfo.ocrComplete}
            hasImages={pdfInfo.hasImages}
          />
        </div>
      )}
    </div>
  );
};

export default PdfTestPage;
