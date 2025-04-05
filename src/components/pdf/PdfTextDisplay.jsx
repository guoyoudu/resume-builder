import React from 'react';
import PropTypes from 'prop-types';

/**
 * PDF文本显示组件
 * 显示提取的文本内容，支持分页显示和全文显示
 */
const PdfTextDisplay = ({ 
  extractedText, 
  textByPage, 
  currentPage, 
  textExtractionSuccess, 
  showAllText, 
  onToggleDisplayMode, 
  ocrProcessing, 
  ocrProgress, 
  ocrComplete, 
  hasImages 
}) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">原始文本</h3>
      
      {/* OCR处理状态 */}
      {ocrProcessing && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700 text-sm font-semibold">正在使用OCR处理PDF文件...</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${ocrProgress}%` }}></div>
          </div>
          <p className="text-blue-600 text-xs mt-1 text-right">{ocrProgress}%</p>
        </div>
      )}
      
      {/* 文本提取状态提示 */}
      {!textExtractionSuccess && !ocrProcessing && extractedText && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-700 text-sm">
            <span className="font-bold">注意：</span> 
            {ocrComplete ? 
              'OCR处理已完成，但未能提取到足够的文本。这可能是因为图像质量较低或文本内容较少。' :
              hasImages ? 
                '该PDF文件可能是扫描件或图像形式，无法直接提取文本。' : 
                '无法从该PDF文件中提取足够的文本。可能是加密的PDF文件或使用了特殊字体。'}
          </p>
        </div>
      )}
      
      {/* OCR成功提示 */}
      {textExtractionSuccess && ocrComplete && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">
            <span className="font-bold">成功：</span> 
            OCR处理成功完成，已提取文本内容。
          </p>
        </div>
      )}
      
      {/* 文本分页切换器 */}
      {textExtractionSuccess && Array.isArray(textByPage) && textByPage.length > 1 && (
        <div className="mb-2 flex items-center">
          <span className="text-sm text-gray-600 mr-2">显示页面:</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => onToggleDisplayMode(false)} 
              className={`px-2 py-1 text-xs rounded ${!showAllText ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              当前页文本
            </button>
            <button 
              onClick={() => onToggleDisplayMode(true)}
              className={`px-2 py-1 text-xs rounded ${showAllText ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              全部文本
            </button>
          </div>
        </div>
      )}
      
      <div className="whitespace-pre-wrap break-words bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
        {extractedText && extractedText.length > 0 ? (
          <>
            <p className="text-gray-500 mb-2">文本长度: {extractedText.length} 字符</p>
            
            {/* 根据显示模式选择显示内容 */}
            {textExtractionSuccess && showAllText ? (
              <div>
                <p className="text-blue-600 text-sm mb-2">显示全部文本</p>
                <div dangerouslySetInnerHTML={{ __html: extractedText.replace(/\n/g, '<br/>') }} />
              </div>
            ) : textExtractionSuccess && Array.isArray(textByPage) && textByPage.length > 0 && currentPage <= textByPage.length ? (
              <div>
                <p className="text-blue-600 text-sm mb-2">当前显示第 {currentPage} 页文本</p>
                <div dangerouslySetInnerHTML={{ __html: textByPage[currentPage - 1].replace(/\n/g, '<br/>') }} />
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: extractedText.replace(/\n/g, '<br/>') }} />
            )}
          </>
        ) : '无文本内容'}
      </div>
    </div>
  );
};

PdfTextDisplay.propTypes = {
  extractedText: PropTypes.string,
  textByPage: PropTypes.arrayOf(PropTypes.string),
  currentPage: PropTypes.number.isRequired,
  textExtractionSuccess: PropTypes.bool.isRequired,
  showAllText: PropTypes.bool.isRequired,
  onToggleDisplayMode: PropTypes.func.isRequired,
  ocrProcessing: PropTypes.bool.isRequired,
  ocrProgress: PropTypes.number.isRequired,
  ocrComplete: PropTypes.bool.isRequired,
  hasImages: PropTypes.bool.isRequired
};

PdfTextDisplay.defaultProps = {
  extractedText: '',
  textByPage: [],
  ocrProgress: 0
};

export default PdfTextDisplay;
