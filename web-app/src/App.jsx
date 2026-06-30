import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Calendar, Clock, BookOpen, AlertTriangle, 
  TrendingDown, Shield, Car, Battery, MapPin, Cpu, 
  ArrowUpRight, Zap, RefreshCw, X, Check, Eye, Trash2
} from 'lucide-react';
import initialModelsData from './data/ev_models.json';
import initialNewsData from './data/news.json';

function App() {
  // 1. Initialize State from LocalStorage or Fallbacks
  const [models, setModels] = useState(() => {
    const local = localStorage.getItem('meev_models');
    return local ? JSON.parse(local) : initialModelsData.ev_models;
  });

  const [news, setNews] = useState(() => {
    const local = localStorage.getItem('meev_news');
    return local ? JSON.parse(local) : initialNewsData;
  });

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'models', 'news', 'trends'
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filterBrand, setFilterBrand] = useState('');
  const [filterDrive, setFilterDrive] = useState('');
  const [filterNewsCategory, setFilterNewsCategory] = useState('');

  // Add/Update News Form State
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('ข่าวยานยนต์');
  const [formRelatedModels, setFormRelatedModels] = useState([]);
  const [formSource, setFormSource] = useState('ผู้ใช้งานจริง/MEEV');
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Alert message
  const [toast, setToast] = useState(null);

  // Server API state
  const SERVER_URL = 'http://localhost:3001';
  const [serverStatus, setServerStatus] = useState(null);  // null = ยังไม่ได้เช็ค
  const [isFetchingFromServer, setIsFetchingFromServer] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('meev_models', JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    localStorage.setItem('meev_news', JSON.stringify(news));
  }, [news]);

  // Set default selected news
  useEffect(() => {
    if (news && news.length > 0 && !selectedNews) {
      setSelectedNews(news[0]);
    }
  }, [news, selectedNews]);

  // ดึงข่าวจาก server เมื่อเปิดแอป
  useEffect(() => {
    checkAndFetchFromServer();
  }, []);

  // Trigger Toast Alert
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // ดึงข่าวจาก API server (localhost:3001)
  const checkAndFetchFromServer = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/news`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('server error');
      const data = await res.json();
      setServerOnline(true);
      setServerStatus(data.last_updated_th || null);
      if (data.news && data.news.length > 0) {
        // รวมข่าวจาก server กับข่าวที่มีอยู่ (ไม่ duplicate)
        setNews(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = data.news.filter(n => !existingIds.has(n.id));
          if (newOnes.length === 0) return prev;
          const merged = [...newOnes, ...prev].slice(0, 200);
          return merged;
        });
      }
    } catch {
      setServerOnline(false);
      setServerStatus(null);
    }
  };

  // Trigger ดึงข่าวทันที (กด refresh)
  const handleFetchNow = async () => {
    if (isFetchingFromServer) return;
    setIsFetchingFromServer(true);
    showToast('กำลังดึงข่าวล่าสุด...');
    try {
      const res = await fetch(`${SERVER_URL}/api/news/fetch-sync`, { signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setServerOnline(true);
      if (data.news && data.news.length > 0) {
        setNews(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newOnes = data.news.filter(n => !existingIds.has(n.id));
          const merged = [...newOnes, ...prev].slice(0, 200);
          return merged;
        });
        const added = data.fetch_status?.new_articles || 0;
        showToast(`✅ ดึงข่าวใหม่ ${added} ชิ้น สำเร็จ!`);
        setServerStatus(data.fetch_status?.last_fetch_th || null);
      } else {
        showToast('ไม่มีข่าวใหม่เพิ่มเติม');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อ server ได้ กรุณารัน: cd server && npm start', 'error');
      setServerOnline(false);
    } finally {
      setIsFetchingFromServer(false);
    }
  };

  // Reset to initial preloaded data
  const handleResetData = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่? (การอัปเดตที่บันทึกไว้จะหายไป)')) {
      setModels(initialModelsData.ev_models);
      setNews(initialNewsData);
      setSelectedModel(null);
      setSelectedNews(initialNewsData[0]);
      showToast('รีเซ็ตข้อมูลเรียบร้อยแล้ว');
    }
  };

  // Add News Handler
  const handleAddNewsSubmit = (e) => {
    e.preventDefault();
    if (!formTitle || !formContent) {
      showToast('กรุณากรอกหัวข้อและเนื้อหาข่าวให้ครบถ้วน', 'error');
      return;
    }

    const newArticle = {
      id: 'news_' + Date.now(),
      title: formTitle,
      summary: formSummary || formContent.slice(0, 120) + '...',
      content: formContent,
      category: formCategory,
      related_models: formRelatedModels,
      published_date: formDate,
      source: formSource,
      trending: false
    };

    const updatedNews = [newArticle, ...news];
    setNews(updatedNews);
    setSelectedNews(newArticle);
    setIsAddingNews(false);
    
    // Clear Form
    setFormTitle('');
    setFormSummary('');
    setFormContent('');
    setFormRelatedModels([]);
    showToast('เพิ่มข่าวสารเรียบร้อยแล้ว');
  };

  // Delete News Handler
  const handleDeleteNews = (id, e) => {
    e.stopPropagation();
    if (window.confirm('คุณต้องการลบข่าวสารนี้ใช่หรือไม่?')) {
      const filtered = news.filter(item => item.id !== id);
      setNews(filtered);
      if (selectedNews && selectedNews.id === id) {
        setSelectedNews(filtered.length > 0 ? filtered[0] : null);
      }
      showToast('ลบข่าวสารเรียบร้อยแล้ว');
    }
  };

  // Calculate Data Insights for Dashboard
  const totalModels = models.length;
  
  // Flatten variants to analyze
  const allVariants = models.flatMap(m => m.variants.map(v => ({
    ...v,
    brand: m.brand,
    model_name: m.model_name,
    model_id: m.model_id
  })));

  const averagePriceCurrent = Math.round(
    allVariants.reduce((sum, v) => sum + v.current_price_thb, 0) / allVariants.length
  );
  
  const averageRange = Math.round(
    allVariants.reduce((sum, v) => sum + v.range_km_nedc, 0) / allVariants.length
  );

  const averagePriceDrop = Math.round(
    allVariants.reduce((sum, v) => sum + (v.launch_price_thb - v.current_price_thb), 0) / allVariants.length
  );

  const maxPriceDropVariant = [...allVariants].sort((a, b) => 
    (b.launch_price_thb - b.current_price_thb) - (a.launch_price_thb - a.current_price_thb)
  )[0];

  const mostEfficientVariant = [...allVariants].sort((a, b) => 
    a.energy_consumption_kwh_100km - b.energy_consumption_kwh_100km
  )[0];

  // Dynamic Keyword Scanning for User Problems to Categorize Trends
  const problemCategories = {
    'ช่วงล่าง/การเกาะถนน': 0,
    'ซอฟต์แวร์/ระบบค้าง': 0,
    'บริการหลังการขาย/อะไหล่ช้า': 0,
    'ห้องโดยสาร/ความร้อนสะสม': 0,
    'ระบบชาร์จไฟฟ้า': 0,
    'อื่นๆ': 0
  };

  models.forEach(model => {
    model.user_problems.forEach(problem => {
      let categorized = false;
      if (problem.includes('ช่วงล่าง') || problem.includes('ย้วย') || problem.includes('โยน') || problem.includes('กระด้าง') || problem.includes('เกาะถนน')) {
        problemCategories['ช่วงล่าง/การเกาะถนน']++;
        categorized = true;
      }
      if (problem.includes('ซอฟต์แวร์') || problem.includes('ค้าง') || problem.includes('หน้าจอ') || problem.includes('อินเทอร์เน็ต') || problem.includes('สัญญาณ')) {
        problemCategories['ซอฟต์แวร์/ระบบค้าง']++;
        categorized = true;
      }
      if (problem.includes('อะไหล่') || problem.includes('รอนาน') || problem.includes('ดีลเลอร์') || problem.includes('ศูนย์') || problem.includes('เคลม') || problem.includes('ยุติ') || problem.includes('เลิก')) {
        problemCategories['บริการหลังการขาย/อะไหล่ช้า']++;
        categorized = true;
      }
      if (problem.includes('หลังคา') || problem.includes('ร้อน') || problem.includes('ม่าน') || problem.includes('กระจก') || problem.includes('ทัศนวิสัย')) {
        problemCategories['ห้องโดยสาร/ความร้อนสะสม']++;
        categorized = true;
      }
      if (problem.includes('ชาร์จ') || problem.includes('พอร์ต') || problem.includes('ตู้') || problem.includes('หัวชาร์จ')) {
        problemCategories['ระบบชาร์จไฟฟ้า']++;
        categorized = true;
      }
      if (!categorized) {
        problemCategories['อื่นๆ']++;
      }
    });
  });

  // Extract unique brands for filtering
  const brandsList = Array.from(new Set(models.map(m => m.brand)));

  // Filter Models List
  const filteredModels = models.filter(model => {
    const matchesSearch = 
      model.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.user_problems.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesBrand = filterBrand === '' || model.brand === filterBrand;
    const matchesDrive = filterDrive === '' || model.variants.some(v => v.drive_type === filterDrive);
    
    return matchesSearch && matchesBrand && matchesDrive;
  });

  // Filter News List
  const filteredNews = news.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = filterNewsCategory === '' || article.category === filterNewsCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Toggle variant in Form checkbox
  const handleFormModelCheckbox = (modelId) => {
    if (formRelatedModels.includes(modelId)) {
      setFormRelatedModels(formRelatedModels.filter(id => id !== modelId));
    } else {
      setFormRelatedModels([...formRelatedModels, modelId]);
    }
  };

  return (
    <div className="app-container">
      {/* 2. Header and Navigation */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="brand-title">MEEV</h1>
            <p className="brand-subtitle">THAI EV TRENDING & INSIGHTS</p>
          </div>
        </div>
        
        <nav className="main-nav">
          <button 
            id="tab-dashboard"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
          >
            <TrendingDown size={18} />
            วิเคราะห์แนวโน้ม
          </button>
          <button 
            id="tab-models"
            className={`nav-tab-btn ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => { setActiveTab('models'); setSearchQuery(''); }}
          >
            <Car size={18} />
            เปรียบเทียบรุ่นรถ
          </button>
          <button 
            id="tab-news"
            className={`nav-tab-btn ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => { setActiveTab('news'); setSearchQuery(''); }}
          >
            <BookOpen size={18} />
            ข่าวสาร & ข้อมูลผู้ใช้
          </button>
          <button 
            id="reset-btn"
            className="nav-tab-btn" 
            onClick={handleResetData}
            title="รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={16} />
            รีเซ็ต
          </button>
        </nav>
      </header>

      {/* Toast Alert */}
      {toast && (
        <div className="glass-card" style={{
          position: 'fixed',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          padding: '0.75rem 1.5rem',
          borderLeft: `4px solid ${toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'}`,
          background: 'rgba(10, 14, 26, 0.9)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {toast.type === 'error' ? <XCircle size={18} color="var(--accent-red)" /> : <Check size={18} color="var(--accent-green)" />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      {/* 3. Main Dashboard View */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div>
            {/* Stat row */}
            <div className="dashboard-grid">
              <div className="glass-card stat-card">
                <div className="stat-icon primary">
                  <Car size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">รุ่นรถยนต์ที่วิเคราะห์</span>
                  <span className="stat-value">{totalModels} รุ่น</span>
                  <span className="stat-subtext">ครอบคลุม 11 รุ่นหลักในตลาด</span>
                </div>
              </div>

              <div className="glass-card stat-card">
                <div className="stat-icon secondary">
                  <TrendingDown size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">ลดราคาเฉลี่ยต่อรุ่น</span>
                  <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
                    -{Math.round(averagePriceDrop / 1000).toLocaleString()}k
                  </span>
                  <span className="stat-subtext">จากราคาเปิดตัวคลังสินค้านำเข้า</span>
                </div>
              </div>

              <div className="glass-card stat-card">
                <div className="stat-icon blue">
                  <Battery size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">ระยะทางวิ่งเฉลี่ย</span>
                  <span className="stat-value">{averageRange} กม.</span>
                  <span className="stat-subtext">มาตรฐาน NEDC / WLTP</span>
                </div>
              </div>

              <div className="glass-card stat-card">
                <div className="stat-icon green">
                  <Zap size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">เฉลี่ยราคาจำหน่ายปัจจุบัน</span>
                  <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
                    {(averagePriceCurrent / 1000000).toFixed(2)}M
                  </span>
                  <span className="stat-subtext">ล้านบาท (ราคาเฉลี่ยทุกรุ่นย่อย)</span>
                </div>
              </div>
            </div>

            {/* Visualizations row */}
            <div className="visualizations-row">
              {/* Range vs Price Scatter Plot */}
              <div className="glass-card chart-container">
                <div className="chart-header">
                  <h3 className="chart-title">
                    <Zap size={18} color="var(--primary)" />
                    วิเคราะห์ความคุ้มค่า: ระยะทางวิ่ง กับ ราคาจำหน่ายปัจจุบัน
                  </h3>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-color" style={{background: 'var(--primary)'}}></span>รุ่น RWD ขับหลัง</span>
                    <span className="legend-item"><span className="legend-color" style={{background: 'var(--secondary)'}}></span>รุ่น FWD ขับหน้า</span>
                    <span className="legend-item"><span className="legend-color" style={{background: 'var(--accent-green)'}}></span>รุ่น AWD ขับสี่</span>
                  </div>
                </div>
                
                <div className="chart-canvas">
                  <svg viewBox="0 0 500 240" width="100%" height="100%" style={{ overflow: 'visible' }}>
                    {/* Gridlines */}
                    <line x1="40" y1="20" x2="40" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <line x1="40" y1="200" x2="480" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    
                    <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    
                    <line x1="150" y1="20" x2="150" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="260" y1="20" x2="260" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="370" y1="20" x2="370" y2="200" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    
                    {/* Axes Labels */}
                    <text x="35" y="215" fill="var(--text-muted)" fontSize="8" textAnchor="middle">0.3M</text>
                    <text x="150" y="215" fill="var(--text-muted)" fontSize="8" textAnchor="middle">0.8M</text>
                    <text x="260" y="215" fill="var(--text-muted)" fontSize="8" textAnchor="middle">1.3M</text>
                    <text x="370" y="215" fill="var(--text-muted)" fontSize="8" textAnchor="middle">1.8M</text>
                    <text x="470" y="215" fill="var(--text-muted)" fontSize="8" textAnchor="middle">2.3M</text>
                    <text x="260" y="235" fill="var(--text-secondary)" fontSize="9" textAnchor="middle" fontWeight="600">ราคาจำหน่ายปัจจุบัน (ล้านบาท)</text>
                    
                    <text x="18" y="200" fill="var(--text-muted)" fontSize="8" textAnchor="right">200</text>
                    <text x="18" y="140" fill="var(--text-muted)" fontSize="8" textAnchor="right">400</text>
                    <text x="18" y="80" fill="var(--text-muted)" fontSize="8" textAnchor="right">600</text>
                    <text x="18" y="25" fill="var(--text-muted)" fontSize="8" textAnchor="right">800</text>
                    
                    <text x="-110" y="12" fill="var(--text-secondary)" fontSize="9" transform="rotate(-90)" fontWeight="600" textAnchor="middle">ระยะทางวิ่งสูงสุด (กม. NEDC/WLTP)</text>

                    {/* Plots */}
                    {allVariants.map((variant, idx) => {
                      // Mapping Math:
                      // Price: 300k THB to 2,300k THB maps to X: 40 to 470 (range 430)
                      // Range: 200km to 800km maps to Y: 200 to 20 (range 180)
                      const xPercent = Math.max(0, Math.min(1, (variant.current_price_thb - 300000) / 2000000));
                      const yPercent = Math.max(0, Math.min(1, (variant.range_km_nedc - 200) / 600));
                      
                      const cx = 40 + xPercent * 430;
                      const cy = 200 - yPercent * 180;
                      
                      let color = 'var(--primary)'; // RWD
                      if (variant.drive_type === 'FWD') color = 'var(--secondary)';
                      if (variant.drive_type === 'AWD') color = 'var(--accent-green)';
                      
                      return (
                        <g key={idx} style={{ cursor: 'pointer' }} onClick={() => {
                          const originalModel = models.find(m => m.model_id === variant.model_id);
                          if (originalModel) {
                            setSelectedModel(originalModel);
                          }
                        }}>
                          <title>{`${variant.brand} ${variant.model_name} (${variant.name}) \nราคา: ${(variant.current_price_thb/1000000).toFixed(2)}M | ระยะทาง: ${variant.range_km_nedc} กม.`}</title>
                          <circle cx={cx} cy={cy} r="6" fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth="1" className="chart-dot" />
                          {/* Label for notable variants */}
                          {(variant.name.includes('Standard') || variant.name.includes('Premium') || variant.name.includes('L AC/DC') || variant.name.includes('ULTRA') || variant.name.includes('LFP')) && (
                            <text x={cx} y={cy - 10} fill="#ffffff" fontSize="6.5" textAnchor="middle" opacity="0.8">
                              {variant.brand} {variant.model_name}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Insights Panel */}
              <div className="glass-card insights-panel">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={18} color="var(--accent-amber)" />
                  ข้อมูลวิเคราะห์ตลาดที่น่าสนใจ
                </h3>

                <div className="insight-card info">
                  <div className="insight-icon" style={{color: 'var(--accent-blue)'}}><TrendingDown size={20} /></div>
                  <div className="insight-text-wrapper">
                    <span className="insight-title">การปรับลดราคาในตลาดสูงมาก</span>
                    <span className="insight-desc">
                      รุ่นที่ปรับราคาลงรุนแรงที่สุดคือ <strong>{maxPriceDropVariant?.brand} {maxPriceDropVariant?.model_name}</strong> หายไปกว่า {(maxPriceDropVariant?.launch_price_thb - maxPriceDropVariant?.current_price_thb).toLocaleString()} บาท (-{Math.round(((maxPriceDropVariant?.launch_price_thb - maxPriceDropVariant?.current_price_thb)/maxPriceDropVariant?.launch_price_thb)*100)}%) เพื่อแข่งขันระบายสต็อกนำเข้า
                    </span>
                  </div>
                </div>

                <div className="insight-card success">
                  <div className="insight-icon" style={{color: 'var(--accent-green)'}}><Zap size={20} /></div>
                  <div className="insight-text-wrapper">
                    <span className="insight-title">ประสิทธิภาพการใช้พลังงานสูงสุด</span>
                    <span className="insight-desc">
                      รุ่นที่ประหยัดไฟฟ้าสูงสุดคือ <strong>{mostEfficientVariant?.brand} {mostEfficientVariant?.model_name}</strong> อัตราสิ้นเปลืองไฟเฉลี่ยเพียง {mostEfficientVariant?.energy_consumption_kwh_100km} kWh ต่อ 100 กม. เหมาะแก่การใช้ในเมืองอย่างคุ้มค่า
                    </span>
                  </div>
                </div>

                <div className="insight-card warning">
                  <div className="insight-icon" style={{color: 'var(--accent-amber)'}}><AlertTriangle size={20} /></div>
                  <div className="insight-text-wrapper">
                    <span className="insight-title">วิกฤตหลังคากระจกและช่วงล่างย้วย</span>
                    <span className="insight-desc">
                      ฟีดแบ็กจากผู้ใช้งานจริงส่วนใหญ่ระบุว่า หลังคากระจกสะสมความร้อนสูงเนื่องจากสภาพอากาศในไทย และรถจีนจำนวนมากจำเป็นต้องเปลี่ยนช่วงล่างหลังขับขี่จริงเนื่องจากมีความอ่อนยวบยาบเกินคอสะพานไทย
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Drops bar chart */}
            <div className="trend-section">
              <h3 className="trend-section-title">
                <TrendingDown size={20} color="var(--accent-red)" />
                สงครามราคา: เปรียบเทียบราคาเปิดตัว VS ราคาจำหน่ายปัจจุบัน
              </h3>
              
              <div className="glass-card" style={{ padding: '2rem 1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {models.map((model) => {
                    // Get base variant for comparison
                    const baseVar = model.variants[0];
                    const discount = baseVar.launch_price_thb - baseVar.current_price_thb;
                    const discountPercent = Math.round((discount / baseVar.launch_price_thb) * 100);
                    
                    return (
                      <div key={model.model_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ fontWeight: 600 }}>{model.brand} {model.model_name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({baseVar.name})</span></span>
                          <span style={{ fontFamily: 'var(--font-en)', fontWeight: 600 }}>
                            {baseVar.current_price_thb.toLocaleString()} บาท 
                            {discount > 0 && <span style={{ color: 'var(--accent-red)', marginLeft: '0.5rem' }}>(-{discountPercent}%)</span>}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '7px', overflow: 'hidden', position: 'relative' }}>
                            {/* Launch price bar */}
                            <div style={{ 
                              position: 'absolute', 
                              left: 0, 
                              top: 0, 
                              height: '100%', 
                              width: `${(baseVar.launch_price_thb / 2300000) * 100}%`, 
                              background: 'rgba(255,255,255,0.08)' 
                            }}></div>
                            {/* Current price bar */}
                            <div style={{ 
                              position: 'absolute', 
                              left: 0, 
                              top: 0, 
                              height: '100%', 
                              width: `${(baseVar.current_price_thb / 2300000) * 100}%`, 
                              background: 'linear-gradient(to right, var(--primary), var(--secondary))' 
                            }}></div>
                          </div>
                          
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '90px', textAlign: 'right', fontFamily: 'var(--font-en)' }}>
                            เดิม: {Math.round(baseVar.launch_price_thb/1000)}k
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Models Comparison Grid View */}
        {activeTab === 'models' && (
          <div>
            {/* Search and Filters */}
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="ค้นหาแบรนด์, รุ่นรถ หรือปัญหา เช่น ช่วงล่าง, แอร์, ชาร์จช้า..." 
                  className="search-input" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                id="filter-brand"
                className="select-filter"
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
              >
                <option value="">ทุกแบรนด์</option>
                {brandsList.map(brand => <option key={brand} value={brand}>{brand}</option>)}
              </select>

              <select 
                id="filter-drive"
                className="select-filter"
                value={filterDrive}
                onChange={(e) => setFilterDrive(e.target.value)}
              >
                <option value="">ทุกระบบขับเคลื่อน</option>
                <option value="FWD">FWD (ขับเคลื่อนล้อหน้า)</option>
                <option value="RWD">RWD (ขับเคลื่อนล้อหลัง)</option>
                <option value="AWD">AWD (ขับเคลื่อนสี่ล้อ)</option>
              </select>
            </div>

            {/* Grid */}
            <div className="models-grid">
              {filteredModels.map((model) => {
                const baseVar = model.variants[0];
                const priceDrop = baseVar.launch_price_thb - baseVar.current_price_thb;
                const hasDrop = priceDrop > 0;
                
                return (
                  <div 
                    key={model.model_id} 
                    className="glass-card model-card" 
                    onClick={() => setSelectedModel(model)}
                  >
                    {hasDrop ? (
                      <span className="card-badge-trend">
                        ลด {Math.round((priceDrop / baseVar.launch_price_thb) * 100)}%
                      </span>
                    ) : (
                      <span className="card-badge-trend stable">เสถียร</span>
                    )}

                    <span className="card-brand">{model.brand}</span>
                    <h3 className="card-model-name">
                      {model.model_name}
                      <span className="card-model-year">ปี {model.launch_year}</span>
                    </h3>

                    <div className="card-spec-row">
                      <span className="spec-name">ขนาดแบตเตอรี่</span>
                      <span className="spec-val">{baseVar.battery_capacity_kwh} kWh</span>
                    </div>

                    <div className="card-spec-row">
                      <span className="spec-name">ระยะทางวิ่ง</span>
                      <span className="spec-val">{baseVar.range_km_nedc} กม.</span>
                    </div>

                    <div className="card-spec-row">
                      <span className="spec-name">ระบบขับเคลื่อน</span>
                      <span className="spec-val">{baseVar.drive_type}</span>
                    </div>

                    <div className="card-spec-row">
                      <span className="spec-name">อัตราสิ้นเปลืองไฟ</span>
                      <span className="spec-val">{baseVar.energy_consumption_kwh_100km} kWh/100km</span>
                    </div>

                    <div className="card-price-section">
                      <div className="price-history">
                        {hasDrop && <span className="price-old">{baseVar.launch_price_thb.toLocaleString()}</span>}
                        <span className="price-new">
                          {baseVar.current_price_thb.toLocaleString()}
                          <span className="price-currency">บาท</span>
                        </span>
                      </div>

                      <span className="card-view-details">
                        <Eye size={14} /> รายละเอียด
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredModels.length === 0 && (
                <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  ไม่พบข้อมูลตามคำค้นหาและตัวกรองที่ระบุ
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. News & Updates Tab View */}
        {activeTab === 'news' && (
          <div className="news-layout">

            {/* Server Status Bar */}
            <div className="server-status-bar" style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
              <div className={`server-status-indicator ${serverOnline ? 'online' : 'offline'}`}>
                <span className="status-dot" />
                <span>{serverOnline ? 'เซิร์ฟเวอร์ออนไลน์' : 'เซิร์ฟเวอร์ออฟไลน์'}</span>
                {serverStatus && serverOnline && (
                  <span className="status-last-update">อัปเดตล่าสุด: {serverStatus}</span>
                )}
                {!serverOnline && (
                  <span className="status-hint">รัน: <code>cd server &amp;&amp; npm start</code> เพื่อเปิดใช้งาน</span>
                )}
              </div>
              <button
                className={`refresh-news-btn ${isFetchingFromServer ? 'loading' : ''}`}
                onClick={handleFetchNow}
                disabled={isFetchingFromServer || !serverOnline}
                title="ดึงข่าวใหม่จากแหล่งข่าวทันที"
              >
                <RefreshCw size={14} className={isFetchingFromServer ? 'spin' : ''} />
                {isFetchingFromServer ? 'กำลังดึง...' : 'รีเฟรชข่าว'}
              </button>
            </div>

            {/* News Sidebar pane */}
            <div className="news-list-pane-wrapper">
              {/* Controls: Search + Add button */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="search-input-wrapper" style={{ flex: 1 }}>
                  <Search size={16} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาในเนื้อหาข่าวสาร..." 
                    className="search-input" 
                    style={{ padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  id="add-news-btn"
                  className="primary-btn" 
                  style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', boxShadow: 'none', flexShrink: 0 }}
                  onClick={() => setIsAddingNews(true)}
                >
                  <Plus size={16} /> เขียนข่าว
                </button>
              </div>

              {/* Category Filter — outside scroll area so it's never clipped */}
              <div className="news-category-filter-bar">
                {['', 'สงครามราคา', 'ประกันภัย', 'สถานีชาร์จและบริการ', 'ข่าวยานยนต์', 'เปิดตัวรุ่นใหม่'].map(cat => (
                  <button
                    key={cat}
                    className={`category-filter-btn${filterNewsCategory === cat ? ' active' : ''}`}
                    onClick={() => setFilterNewsCategory(cat)}
                  >
                    {cat === '' ? 'ทั้งหมด' : cat}
                  </button>
                ))}
              </div>

              {/* Scrollable news list */}
              <div className="news-list-pane">

              {/* News list */}
              {filteredNews.map(article => (
                <div 
                  key={article.id} 
                  className={`glass-card news-card-item ${selectedNews?.id === article.id ? 'active' : ''}`}
                  onClick={() => setSelectedNews(article)}
                >
                  <div className="news-meta">
                    <span className="news-category-badge">{article.category}</span>
                    <span>{article.published_date}</span>
                  </div>
                  <h4 className="news-card-title">{article.title}</h4>
                  <p className="news-card-summary">{article.summary}</p>
                  
                  {/* Delete button if user added it */}
                  {article.id.startsWith('news_17') && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button 
                        className="nav-tab-btn" 
                        style={{ color: 'var(--accent-red)', padding: '0.2rem', margin: 0 }}
                        onClick={(e) => handleDeleteNews(article.id, e)}
                      >
                        <Trash2 size={14} /> ลบ
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredNews.length === 0 && (
                <div className="news-empty-state">
                  ไม่พบข่าวสารที่ค้นหา
                </div>
              )}
              </div>{/* end news-list-pane */}
            </div>{/* end news-list-pane-wrapper */}

            {/* Read News Pane */}
            <div className="glass-card news-read-pane">
              {selectedNews ? (
                <div>
                  <div className="read-news-header">
                    <h2 className="read-news-title">{selectedNews.title}</h2>
                    <div className="read-news-meta">
                      <div className="meta-icon-text">
                        <Calendar size={14} />
                        <span>วันที่: {selectedNews.published_date}</span>
                      </div>
                      <div className="meta-icon-text">
                        <Clock size={14} />
                        <span>หมวดหมู่: {selectedNews.category}</span>
                      </div>
                      <div className="meta-icon-text">
                        <BookOpen size={14} />
                        <span>แหล่งที่มา: {selectedNews.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="read-news-content">
                    {selectedNews.content}
                  </div>

                  {selectedNews.related_models && selectedNews.related_models.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2rem', marginBottom: '0.5rem' }}>
                        รุ่นรถยนต์ไฟฟ้าที่เกี่ยวข้อง:
                      </h4>
                      <div className="related-models-list">
                        {selectedNews.related_models.map(modelId => {
                          const car = models.find(m => m.model_id === modelId);
                          if (!car) return null;
                          return (
                            <span 
                              key={modelId} 
                              className="related-model-tag"
                              onClick={() => setSelectedModel(car)}
                            >
                              <Car size={12} />
                              {car.brand} {car.model_name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="news-empty-state">
                  เลือกข่าวสารจากแถบด้านซ้ายเพื่อเปิดอ่านเนื้อหาฉบับเต็ม
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 6. Model Detail Side Drawer */}
      {selectedModel && (
        <div className="drawer-overlay" onClick={() => setSelectedModel(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close-btn" onClick={() => setSelectedModel(null)}>
              <X size={20} />
            </button>

            <span className="drawer-brand">{selectedModel.brand}</span>
            <h2 className="drawer-title">{selectedModel.model_name} (ปี {selectedModel.launch_year})</h2>

            {/* Spec breakdown */}
            <h3 className="drawer-section-title">
              <Cpu size={16} /> ข้อมูลและรุ่นย่อย (Variants)
            </h3>
            
            {selectedModel.variants.map((v, i) => (
              <div key={i} className="variant-box">
                <div className="variant-header">
                  <span>{v.name}</span>
                  <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-en)' }}>
                    {v.current_price_thb.toLocaleString()} บาท 
                    {v.launch_price_thb > v.current_price_thb && (
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        {v.launch_price_thb.toLocaleString()}
                      </span>
                    )}
                  </span>
                </div>
                <div className="variant-grid">
                  <div><span style={{color: 'var(--text-secondary)'}}>แบตเตอรี่:</span> {v.battery_capacity_kwh} kWh ({v.battery_type})</div>
                  <div><span style={{color: 'var(--text-secondary)'}}>ระยะทางวิ่ง:</span> {v.range_km_nedc} กม.</div>
                  <div><span style={{color: 'var(--text-secondary)'}}>พละกำลัง:</span> {v.motor_power_hp} แรงม้า</div>
                  <div><span style={{color: 'var(--text-secondary)'}}>ระบบขับเคลื่อน:</span> {v.drive_type}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{color: 'var(--text-secondary)'}}>อัตรากินไฟเฉลี่ย:</span> {v.energy_consumption_kwh_100km} kWh/100km
                  </div>
                </div>
              </div>
            ))}

            {/* Feedback from users */}
            <h3 className="drawer-section-title">
              <AlertTriangle size={16} /> เสียงสะท้อนของตัวรถจากผู้ใช้จริง
            </h3>

            <div className="pros-cons-grid">
              <div>
                <h4 style={{ color: 'var(--accent-green)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  จุดแข็ง / ข้อดี
                </h4>
                <ul className="pros-list">
                  {selectedModel.user_pros.map((pro, i) => (
                    <li key={i} className="pro-item">
                      <Check size={14} style={{ marginTop: '0.2rem' }} />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 style={{ color: 'var(--accent-red)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  จุดอ่อน / ปัญหาที่พบ
                </h4>
                <ul className="cons-list">
                  {selectedModel.user_problems.map((con, i) => (
                    <li key={i} className="con-item">
                      <X size={14} style={{ marginTop: '0.2rem' }} />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Connected News */}
            <h3 className="drawer-section-title">
              <BookOpen size={16} /> ข่าวสารที่เกี่ยวข้อง
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {news.filter(n => n.related_models.includes(selectedModel.model_id)).map(n => (
                <div 
                  key={n.id} 
                  className="glass-card" 
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => {
                    setSelectedNews(n);
                    setActiveTab('news');
                    setSelectedModel(null);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>{n.category}</span>
                    <span>{n.published_date}</span>
                  </div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</h4>
                </div>
              ))}
              
              {news.filter(n => n.related_models.includes(selectedModel.model_id)).length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>ยังไม่มีบทความข่าวสารอ้างอิงถึงรุ่นนี้</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Add News Dialog Modal */}
      {isAddingNews && (
        <div className="drawer-overlay" onClick={() => setIsAddingNews(false)}>
          <div className="drawer-content" style={{ maxWidth: '650px', alignSelf: 'center', height: 'auto', borderRadius: '16px', margin: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close-btn" onClick={() => setIsAddingNews(false)}>
              <X size={20} />
            </button>

            <h2 className="drawer-title" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
              เขียนและอัปเดตข่าวสาร/ข้อมูลผู้ใช้
            </h2>

            <form onSubmit={handleAddNewsSubmit} className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">หัวข้อข่าวสาร/อัปเดต *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="เช่น เผยสถิติค่าชาร์จไฟข้ามจังหวัดช่วงเทศกาล..."
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">หมวดหมู่ข่าว *</label>
                <select 
                  className="form-input"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  <option value="ข่าวยานยนต์">ข่าวยานยนต์</option>
                  <option value="สงครามราคา">สงครามราคา</option>
                  <option value="ประกันภัย">ประกันภัย</option>
                  <option value="สถานีชาร์จและบริการ">สถานีชาร์จและบริการ</option>
                  <option value="เปิดตัวรุ่นใหม่">เปิดตัวรุ่นใหม่</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">แหล่งข่าวสาร/อ้างอิง *</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">สรุปย่อสั้นๆ (Summary)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="รายละเอียดสังเขปสั้นๆ 1-2 ประโยค"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">เนื้อหาบทความ (รายละเอียดข่าว) *</label>
                <textarea 
                  className="form-textarea" 
                  rows="6"
                  placeholder="เนื้อความโดยละเอียด สามารถแยกย่อหน้าได้..."
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">รุ่นรถยนต์ไฟฟ้าที่เกี่ยวข้อง</label>
                <div className="form-checkbox-group">
                  {models.map(model => (
                    <label key={model.model_id} className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={formRelatedModels.includes(model.model_id)}
                        onChange={() => handleFormModelCheckbox(model.model_id)}
                      />
                      <span>{model.brand} {model.model_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions full-width">
                <button type="button" className="secondary-btn" onClick={() => setIsAddingNews(false)}>ยกเลิก</button>
                <button type="submit" className="primary-btn">บันทึกข่าวสาร</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
