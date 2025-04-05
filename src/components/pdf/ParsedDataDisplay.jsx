import React from 'react';
import PropTypes from 'prop-types';

/**
 * 解析结果显示组件
 * 显示从PDF提取的结构化数据
 */
const ParsedDataDisplay = ({ parsedData }) => {
  if (!parsedData) {
    return null;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2">结构化数据</h3>
      <div className="space-y-2">
        <p>姓名：{parsedData.name || '未检测到'}</p>
        <p>职位：{parsedData.title || '未检测到'}</p>
        
        <div>
          <p className="font-medium">联系方式：</p>
          <ul className="ml-4">
            <li>邮箱：{parsedData.contact.email || '未检测到'}</li>
            <li>电话：{parsedData.contact.phone || '未检测到'}</li>
            <li>网站：{parsedData.contact.website || '未检测到'}</li>
            <li>GitHub：{parsedData.contact.github || '未检测到'}</li>
          </ul>
        </div>
        
        <div>
          <p className="font-medium">技能：</p>
          <ul className="ml-4">
            {parsedData.skills && Array.isArray(parsedData.skills) && parsedData.skills.length > 0 ? (
              parsedData.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))
            ) : (
              <li>未检测到技能</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

ParsedDataDisplay.propTypes = {
  parsedData: PropTypes.shape({
    name: PropTypes.string,
    title: PropTypes.string,
    contact: PropTypes.shape({
      email: PropTypes.string,
      phone: PropTypes.string,
      website: PropTypes.string,
      github: PropTypes.string
    }),
    skills: PropTypes.arrayOf(PropTypes.string)
  })
};

export default ParsedDataDisplay;
