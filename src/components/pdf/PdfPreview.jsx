import React from 'react';
import PropTypes from 'prop-types';

/**
 * PDF预览组件
 * 显示PDF页面预览和分页控制
 */
const PdfPreview = ({ previewUrls, currentPage, pageCount, onPageChange }) => {
  if (!previewUrls || previewUrls.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">PDF预览</h3>
      <div className="border border-gray-300 rounded">
        <img 
          src={previewUrls[currentPage - 1]} 
          alt={`PDF预览第${currentPage}页`} 
          className="max-w-full h-auto"
        />
      </div>
      
      {/* 分页控制区 */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-gray-500">显示第{currentPage}页 (共{pageCount}页)</p>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => onPageChange(1)} 
            disabled={currentPage === 1}
            className={`px-2 py-1 text-xs rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            首页
          </button>
          <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className={`px-2 py-1 text-xs rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            上一页
          </button>
          <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === pageCount}
            className={`px-2 py-1 text-xs rounded ${currentPage === pageCount ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            下一页
          </button>
          <button 
            onClick={() => onPageChange(pageCount)} 
            disabled={currentPage === pageCount}
            className={`px-2 py-1 text-xs rounded ${currentPage === pageCount ? 'bg-gray-200 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            尾页
          </button>
        </div>
      </div>
    </div>
  );
};

PdfPreview.propTypes = {
  previewUrls: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentPage: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired
};

export default PdfPreview;
