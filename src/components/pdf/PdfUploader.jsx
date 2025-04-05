import React from 'react';
import PropTypes from 'prop-types';

/**
 * PDF文件上传组件
 * 处理PDF文件的选择和上传
 */
const PdfUploader = ({ onFileUpload, isProcessing, uploadError, fileInputRef }) => {
  return (
    <div className="mb-6">
      <label
        htmlFor="pdfUpload"
        className="block w-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors"
      >
        <span className="text-gray-600">
          {isProcessing ? '正在处理...' : '点击或拖拽PDF文件到这里'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          id="pdfUpload"
          accept=".pdf"
          className="hidden"
          onChange={onFileUpload}
          disabled={isProcessing}
        />
      </label>
      {uploadError && (
        <p className="mt-2 text-red-500">{uploadError}</p>
      )}
    </div>
  );
};

PdfUploader.propTypes = {
  onFileUpload: PropTypes.func.isRequired,
  isProcessing: PropTypes.bool.isRequired,
  uploadError: PropTypes.string,
  fileInputRef: PropTypes.object.isRequired
};

PdfUploader.defaultProps = {
  uploadError: ''
};

export default PdfUploader;
