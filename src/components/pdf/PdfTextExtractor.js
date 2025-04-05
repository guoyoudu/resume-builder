import * as pdfjsLib from 'pdfjs-dist';

// 设置PDF.js worker
// 使用pdfjs-dist自带的worker
const pdfjsVersion = '3.4.120'; // 确保这与您安装的pdfjs-dist版本一致
const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;

// 设置Worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  console.log('PDF.js worker路径设置成功:', workerSrc);
} catch (error) {
  console.error('PDF.js worker路径设置失败:', error);
}

/**
 * 获取PDF页数
 * @param {File} file - PDF文件
 * @returns {Promise<number>} - 页数
 */
export const getPdfPageCount = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async (event) => {
      try {
        console.log('文件读取成功，开始获取页数...');
        const arrayBuffer = event.target.result;
        console.log('数据长度:', arrayBuffer.byteLength);
        
        // 使用最简单的配置打开PDF
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer)
        });
        
        console.log('等待PDF加载完成...');
        const pdf = await loadingTask.promise;
        console.log('成功打开PDF文件，页数:', pdf.numPages);
        resolve(pdf.numPages);
      } catch (error) {
        console.error('获取PDF页数时出错:', error);
        reject(error);
      }
    };
    
    fileReader.onerror = (error) => {
      console.error('读取文件时出错:', error);
      reject(error);
    };
    
    console.log('开始读取文件...');
    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * 生成PDF预览图像
 * @param {File} file - PDF文件
 * @returns {Promise<string[]>} - 预览图URL数组
 */
export const generatePdfPreview = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        
        // 使用PDF.js打开PDF文件
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          disableFontFace: false
        });
        
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        console.log(`PDF总页数: ${totalPages}`);
        
        // 预先生成所有页面的预览
        const previewUrls = [];
        
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          previewUrls.push(canvas.toDataURL('image/png'));
        }
        
        resolve(previewUrls);
      } catch (error) {
        console.error('生成PDF预览时出错:', error);
        reject(error);
      }
    };
    
    fileReader.onerror = (error) => {
      console.error('读取文件时出错:', error);
      reject(error);
    };
    
    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * 从PDF提取文本
 * @param {File} file - PDF文件
 * @returns {Promise<Object>} - 提取结果
 */
export const extractTextFromPDF = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    
    fileReader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        
        // 使用PDF.js打开PDF文件，启用高级选项
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          disableFontFace: false,  // 启用字体加载以提高文本提取质量
          ignoreErrors: true,      // 忽略非致命错误
          cMapUrl: `${process.env.PUBLIC_URL}/cmaps/`, // 添加cMap支持以提高多语言支持
          cMapPacked: true,
          standardFontDataUrl: `${process.env.PUBLIC_URL}/standard_fonts/` // 标准字体支持
        });
        
        console.log('等待PDF加载完成...');
        const pdf = await loadingTask.promise;
        console.log('成功打开PDF文件，页数:', pdf.numPages);
        
        // 逐页提取文本
        let allText = '';
        let textByPage = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            console.log(`处理第${i}页...`);
            const page = await pdf.getPage(i);
            
            // 获取页面的文本内容
            const textContent = await page.getTextContent({
              normalizeWhitespace: true, // 规范化空白字符
              disableCombineTextItems: false // 允许合并相邻的文本项
            });
            
            // 打印文本项的统计信息
            console.log(`第${i}页文本项数量: ${textContent.items.length}`);
            
            // 使用更高级的文本提取逻辑
            // 保留文本项的位置信息以便更好地重建文本布局
            const textItems = textContent.items.map(item => ({
              text: item.str,
              x: item.transform[4], // x坐标
              y: item.transform[5], // y坐标
              width: item.width,
              height: item.height,
              fontName: item.fontName
            }));
            
            // 按行分组文本项（基于y坐标的相似性）
            const lineHeight = 5; // 允许的行高度误差
            let lines = [];
            let currentLine = [];
            
            // 按y坐标排序（从顶部到底部）
            const sortedItems = [...textItems].sort((a, b) => b.y - a.y);
            
            if (sortedItems.length > 0) {
              currentLine = [sortedItems[0]];
              
              for (let j = 1; j < sortedItems.length; j++) {
                const currentItem = sortedItems[j];
                const prevItem = currentLine[currentLine.length - 1];
                
                // 如果y坐标相近，认为是同一行
                if (Math.abs(currentItem.y - prevItem.y) < lineHeight) {
                  currentLine.push(currentItem);
                } else {
                  // 按x坐标排序当前行
                  currentLine.sort((a, b) => a.x - b.x);
                  lines.push(currentLine);
                  currentLine = [currentItem];
                }
              }
              
              // 添加最后一行
              if (currentLine.length > 0) {
                currentLine.sort((a, b) => a.x - b.x);
                lines.push(currentLine);
              }
            }
            
            // 将行转换为文本
            let pageText = '';
            if (Array.isArray(lines)) {
              pageText = lines.map(line => {
                if (Array.isArray(line)) {
                  return line.map(item => item.text).join(' ');
                }
                return line && typeof line.text === 'string' ? line.text : '';
              }).join('\n');
            } else {
              console.warn('lines不是数组，无法处理文本行');
              pageText = '无法提取文本';
            }
            
            // 存储每页的文本
            textByPage.push(pageText);
            allText += pageText + '\n\n';
            
            console.log(`第${i}页文本提取完成，长度: ${pageText.length}`);
            if (pageText.length > 0) {
              console.log('页面文本样本:', pageText.substring(0, 100) + '...');
            }
            
          } catch (pageError) {
            console.error(`处理第${i}页时出错:`, pageError);
            textByPage.push(`[无法提取第${i}页文本: ${pageError.message}]`);
          }
        }
        
        // 清理和格式化最终文本
        allText = allText
          .replace(/\s{2,}/g, ' ')  // 将多个空白字符合并为一个
          .replace(/\n\s+/g, '\n')  // 删除行首空白
          .replace(/\n{3,}/g, '\n\n')  // 限制连续空行
          .trim();
        
        console.log('提取完成，总文本长度:', allText.length);
        
        // 检查提取的文本是否有效
        const isTextValid = allText.length > 50; // 如果文本少于50个字符，可能是提取失败
        
        if (isTextValid) {
          console.log('提取的文本前200个字符:', allText.substring(0, 200));
          
          // 返回包含全文本和分页文本的对象
          resolve({
            fullText: allText,
            textByPage: textByPage,
            success: true
          });
        } else {
          console.warn('提取的文本数量过少，可能是扫描的PDF');
          
          // 尝试检查是否有图像内容
          let hasImages = false;
          for (let i = 1; i <= pdf.numPages; i++) {
            try {
              const page = await pdf.getPage(i);
              const operatorList = await page.getOperatorList();
              // 检查是否有图像操作符
              if (operatorList.fnArray.some(op => op === pdfjsLib.OPS.paintImageXObject || op === pdfjsLib.OPS.paintImageMaskXObject)) {
                hasImages = true;
                break;
              }
            } catch (e) {
              console.error('检查图像时出错:', e);
            }
          }
          
          // 如果检测到图像，我们会在后续使用OCR处理，但这里仍然返回初始错误信息
          const errorMessage = hasImages 
            ? '该PDF文件似乎是扫描件或图像形式的PDF，无法直接提取文本。正在尝试使用OCR识别...' 
            : '无法从该PDF文件中提取文本。可能是加密的PDF文件或使用了特殊字体。';
          
          resolve({
            fullText: errorMessage,
            textByPage: [errorMessage],
            success: false,
            hasImages: hasImages,
            needsOcr: hasImages // 标记是否需要OCR处理
          });
        }
      } catch (error) {
        console.error('使用PDF.js提取文本时出错:', error);
        reject(new Error(`无法提取PDF文本: ${error.message}`));
      }
    };
    
    fileReader.onerror = (error) => {
      console.error('读取文件时出错:', error);
      reject(new Error('读取文件失败'));
    };
    
    fileReader.readAsArrayBuffer(file);
  });
};
