import React from 'react';
import './AzkarWidget.css';
import { Sun, Moon, ChevronLeft } from 'lucide-react';

interface AzkarWidgetPreviewProps {
  mode?: 'white' | 'dark';
}

const AzkarWidgetPreview: React.FC<AzkarWidgetPreviewProps> = ({ mode = 'dark' }) => {
  const themeClass = mode === 'white' ? 'theme-white' : 'theme-dark';

  return (
    <div className={`azkar-widget-main ${themeClass} animate-in fade-in duration-500`}>
      {/* Morning Button */}
      <a href="ifaqa://azkar/morning" className="azkar-btn">
         <div className="azkar-icon-box morning-icon">
            <Sun size={20} />
         </div>
         <div className="azkar-label-container">
            <span className="azkar-title">أذكار الصباح</span>
            <span className="azkar-subtitle">نور لعامك</span>
         </div>
         <ChevronLeft className="azkar-arrow" size={18} />
      </a>

      {/* Evening Button */}
      <a href="ifaqa://azkar/evening" className="azkar-btn">
         <div className="azkar-icon-box evening-icon">
            <Moon size={20} />
         </div>
         <div className="azkar-label-container">
            <span className="azkar-title">أذكار المساء</span>
            <span className="azkar-subtitle">حفظ لأيامك</span>
         </div>
         <ChevronLeft className="azkar-arrow" size={18} />
      </a>
    </div>
  );
};

export default AzkarWidgetPreview;
