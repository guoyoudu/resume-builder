import { createWorker } from 'tesseract.js';

/**
 * 创建OCR Worker
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Object>} - OCR Worker实例
 */
export const createOcrWorker = async (progressCallback) => {
  try {
    console.log('开始初始化OCR Worker...');
    
    // Tesseract.js 6.0.0版本的创建Worker方式
    // 不传递复杂的配置，使用最简单的方式
    const worker = await createWorker();
    
    // 在worker创建后设置进度回调
    if (typeof progressCallback === 'function') {
      worker.setProgressHandler((progress) => {
        console.log('OCR进度:', progress);
        if (progress.status === 'recognizing text') {
          progressCallback(Math.round(progress.progress * 100));
        }
      });
    }
    
    console.log('Worker创建成功，开始加载语言数据...');
    
    // Tesseract.js 6.0.0版本的语言加载方式
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    console.log('语言数据加载完成');
    
    // 使用最少的参数设置，避免兼容性问题
    await worker.setParameters({
      tessedit_ocr_engine_mode: 3, // 使用神经网络引擎
      tessedit_pageseg_mode: 1    // 自动页面分割
    });
    
    console.log('OCR Worker初始化完成');
    return worker;
  } catch (error) {
    console.error('初始化OCR Worker失败:', error);
    throw error;
  }
};

/**
 * 使用OCR处理PDF预览图像
 * @param {Object} worker - OCR Worker实例
 * @param {string[]} previewUrls - 预览图URL数组
 * @returns {Promise<Object>} - OCR处理结果
 */
export const processWithOcr = async (worker, previewUrls) => {
  // 检查参数
  if (!worker) {
    console.error('OCR Worker不可用');
    throw new Error('OCR Worker不可用');
  }
  
  // 检查预览URL数组
  if (!previewUrls) {
    console.error('previewUrls为空');
    throw new Error('预览图不可用');
  }
  
  // 确保previewUrls是数组
  if (!Array.isArray(previewUrls)) {
    console.error('previewUrls不是数组:', typeof previewUrls);
    console.log('尝试将previewUrls转换为数组');
    // 尝试将previewUrls转换为数组
    try {
      if (typeof previewUrls === 'string') {
        previewUrls = [previewUrls]; // 如果是字符串，将其包装为数组
      } else if (previewUrls && typeof previewUrls === 'object') {
        previewUrls = Object.values(previewUrls); // 如果是对象，尝试提取值
      } else {
        throw new Error('无法将previewUrls转换为数组');
      }
    } catch (error) {
      console.error('转换previewUrls为数组失败:', error);
      throw new Error('预览图格式错误，无法处理');
    }
  }
  
  if (previewUrls.length === 0) {
    console.error('previewUrls数组为空');
    throw new Error('没有可用的预览图');
  }
  
  console.log('开始OCR处理，预览图数量:', previewUrls.length);
  
  // 初始化为空数组，确保是数组类型
  let ocrResults = [];
  const totalPages = previewUrls.length;
  let allOcrText = '';
  
  // 限制处理页数，如果页数过多，只处理前几页
  const pagesToProcess = Math.min(totalPages, 3); // 最多处理前3页，加快速度
  console.log(`将处理${pagesToProcess}页（共${totalPages}页）`);
  
  // 确保我们有一个有效的数组
  if (!Array.isArray(ocrResults)) {
    console.warn('ocrResults不是数组，创建新数组');
    ocrResults = [];
  }
  
  // 逐页OCR处理
  for (let i = 0; i < pagesToProcess; i++) {
    // 进度已经通过worker.progress处理
    // 手动更新进度信息
    // 注意：不同版本的Tesseract.js处理进度的方式不同
    // 我们不直接调用worker.progress，因为它可能是事件监听器
    // 而不是一个函数
    console.log(`OCR处理第${i+1}页，共${pagesToProcess}页...`);
    
    try {
      // 预处理图像，提高OCR质量
      const imageUrl = previewUrls[i];
      if (!imageUrl) {
        console.error(`第${i+1}页的预览URL不可用`);
        ocrResults.push(`[无法识别第${i+1}页文本，预览图不可用]`);
        continue;
      }
      
      // 使用更高级的识别选项
      console.log(`开始识别第${i+1}页...`);
      
      // Tesseract.js 6.0.0的recognize方法
      const result = await worker.recognize(imageUrl);
      // 兼容处理不同版本的返回结构
      const text = result.data?.text || result.text || '';
      const confidence = result.data?.confidence || result.confidence || 0;
      
      console.log(`第${i+1}页OCR识别结果，置信度: ${confidence}%，文本长度: ${text.length}`);
      
      // 清理识别结果
      let cleanedText = text
        .replace(/\s{2,}/g, ' ')  // 将多个空白字符合并为一个
        .replace(/\n\s+/g, '\n')  // 删除行首空白
        .trim();
      
      ocrResults.push(cleanedText);
      allOcrText += cleanedText + '\n\n';
      
      // 如果识别结果很短或置信度低，尝试再次识别使用不同的参数
      if (text.length < 50 || confidence < 70) {
        console.log(`第${i+1}页识别结果不理想，尝试使用不同参数重新识别...`);
        
        // 尝试不同的分割模式
        await worker.setParameters({ 
          tessedit_pageseg_mode: '4', // 假设单列可变大小文本
          textord_tabfind_find_tables: '0' // 不寻找表格，加快处理
        });
        
        console.log(`使用新参数重新识别第${i+1}页...`);
        // Tesseract.js 6.0.0的recognize方法
        const retryResult = await worker.recognize(imageUrl);
        // 兼容处理不同版本的返回结构
        const retryText = retryResult.data?.text || retryResult.text || '';
        const retryConfidence = retryResult.data?.confidence || retryResult.confidence || 0;
        
        console.log(`重新识别结果 - 置信度: ${retryConfidence}%, 文本长度: ${retryText.length}`);
        
        // 如果重新识别的结果更好，则使用新结果
        if (retryText.length > text.length || retryConfidence > confidence) {
          console.log(`重新识别成功，获取到更好的结果`);
          
          // 清理重新识别的文本
          let cleanedRetryText = retryText
            .replace(/\s{2,}/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
          
          ocrResults[i] = cleanedRetryText;
          
          // 重新构建allOcrText
          allOcrText = '';
          // 确保ocrResults是数组
          if (Array.isArray(ocrResults)) {
            for (const pageText of ocrResults) {
              allOcrText += pageText + '\n\n';
            }
          } else {
            console.warn('ocrResults不是数组，无法重建allOcrText');
            allOcrText = cleanedRetryText + '\n\n';
          }
        }
        
        // 恢复原始参数
        await worker.setParameters({ 
          tessedit_pageseg_mode: '1',
          textord_tabfind_find_tables: '1'
        });
      }
    } catch (pageError) {
      console.error(`OCR处理第${i+1}页时出错:`, pageError);
      ocrResults.push(`[无法识别第${i+1}页文本]`);
    }
  }
  
  // 如果还有更多页面未处理，添加提示
  if (pagesToProcess < totalPages) {
    ocrResults.push(`[仅处理了前${pagesToProcess}页，共${totalPages}页]`);
    allOcrText += `\n\n[仅处理了前${pagesToProcess}页，共${totalPages}页]`;
  }
  
  console.log('OCR处理完成，文本长度:', allOcrText.length);
  
  // 清理和格式化OCR提取的文本
  allOcrText = allOcrText
    .replace(/\s{2,}/g, ' ')  // 将多个空白字符合并为一个
    .replace(/\n\s+/g, '\n')  // 删除行首空白
    .replace(/\n{3,}/g, '\n\n')  // 限制连续空行
    .trim();
  
  // 确保ocrResults是数组
  if (!Array.isArray(ocrResults)) {
    console.warn('ocrResults不是数组，创建新数组');
    ocrResults = [allOcrText];
  }
  
  // 更新提取的文本
  return {
    fullText: allOcrText,
    textByPage: ocrResults,
    success: allOcrText.length > 50, // 如果OCR提取的文本足够长，则视为成功
    hasImages: true,
    ocrProcessed: true
  };
};
