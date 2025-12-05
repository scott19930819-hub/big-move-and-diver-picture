/**
 * 异动解读SVG生成器 - JavaScript核心功能
 * 作者: AI助手
 * 功能: 根据JSON数据生成专业的股票异动解读SVG图表
 */

// 全局变量
let currentData = null;
let isGenerating = false;
let currentPage = 0;
let totalPages = 0;
let svgContents = [];

// 强化初始化的重试与幂等控制
let initRetryCount = 0;
const MAX_INIT_RETRIES = 5;
let appInitialized = false;

// DOM元素引用
const elements = {
    jsonInput: null,
    loadExampleBtn: null,
    generateSvgBtn: null,
    downloadSvgBtn: null,
    downloadPngBtn: null,
    downloadAllBtn: null,
    generateVideoBtn: null,
    svgContainer: null,
    statusMessage: null,
    paginationContainer: null,
    prevPageBtn: null,
    nextPageBtn: null,
    pageIndicator: null,
    videoContainer: null
};

// 示例数据
const EXAMPLE_DATA = {
    "title_main": "Sep 15",
    "title_sub": "Big Movers & Drivers",
    "data": [
        {
            "ticker": "CHEK",
            "name": "Check-cap",
            "logo": "https://cdn.ainvest.com/icon/us/CHEK.png",
            "driver": "Merger deal with MBody AI; cancer diagnostics focus",
            "change_pct": "+184.18%"
        },
        {
            "ticker": "HSDT",
            "name": "Helius Medical",
            "logo": "https://cdn.ainvest.com/icon/us/HSDT.png",
            "driver": "PIPE financing; launched Sol Treasury with $500M",
            "change_pct": "+141.67%"
        },
        {
            "ticker": "NAOV",
            "name": "NanoVibronix",
            "logo": "https://cdn.ainvest.com/icon/us/NAOV.png",
            "driver": "Patent for medical navigation; home healthcare devices",
            "change_pct": "+64.87%"
        },
        {
            "ticker": "OPI",
            "name": "Office Properties",
            "logo": "https://cdn.ainvest.com/icon/us/OPI.png",
            "driver": "ABS issuance surged; dividend suspended",
            "change_pct": "+59.71%"
        },
        {
            "ticker": "RCEL",
            "name": "AVITA Medical",
            "logo": "https://cdn.ainvest.com/icon/us/RCEL.png",
            "driver": "RECELL GO gained EU CE mark; Europe expansion",
            "change_pct": "+48.25%"
        },
        {
            "ticker": "GLUE",
            "name": "Monte Rosa",
            "logo": "https://cdn.ainvest.com/icon/us/GLUE.png",
            "driver": "$5.7B Novartis drug partnership",
            "change_pct": "+44.07%"
        },
        {
            "ticker": "WOLF",
            "name": "Wolfspeed",
            "logo": "https://cdn.ainvest.com/icon/us/WOLF.png",
            "driver": "Restructuring cut debt 70%; SiC semiconductor focus",
            "change_pct": "+27.04%"
        },
        {
            "ticker": "GPUS",
            "name": "Hyperscale Data",
            "logo": "https://cdn.ainvest.com/icon/us/GPUS.png",
            "driver": "NVIDIA GPU expansion; $100M Bitcoin fund",
            "change_pct": "+22.43%"
        }
    ]
};

/**
 * 初始化应用
 */
function initApp() {
    // 如果已初始化，直接返回，避免重复绑定事件
    if (appInitialized) return;
    // 获取DOM元素引用
    elements.jsonInput = document.getElementById('json-input');
    elements.loadExampleBtn = document.getElementById('load-example');
    elements.generateSvgBtn = document.getElementById('generate-svg');
    elements.downloadSvgBtn = document.getElementById('download-svg');
    elements.downloadPngBtn = document.getElementById('download-png');
    elements.downloadAllBtn = document.getElementById('download-all');
    elements.generateVideoBtn = document.getElementById('generate-video');
    elements.svgContainer = document.getElementById('svg-container');
    elements.statusMessage = document.getElementById('status-message');
    elements.paginationContainer = document.getElementById('pagination-container');
    elements.prevPageBtn = document.getElementById('prev-page');
    elements.nextPageBtn = document.getElementById('next-page');
    elements.pageIndicator = document.getElementById('page-indicator');
    
    // 视频容器：优先使用页面中已有的节点，若无则创建
    elements.videoContainer = document.getElementById('video-container');
    if (!elements.videoContainer) {
        elements.videoContainer = document.createElement('div');
        elements.videoContainer.id = 'video-container';
        elements.videoContainer.style.display = 'none';
        document.body.appendChild(elements.videoContainer);
    }
    
    // 关键元素校验（仅校验必须元素，减少误报）
    const criticalKeys = [
        'jsonInput',
        'svgContainer',
        'statusMessage'
    ];
    const missingCritical = criticalKeys.filter(key => !elements[key]);
    
    if (missingCritical.length > 0) {
        console.warn('⚠️ 初始化时未找到关键DOM元素，准备重试:', missingCritical, `第 ${initRetryCount + 1} 次`);
        if (initRetryCount < MAX_INIT_RETRIES) {
            initRetryCount++;
            // 轻微延迟后重试，避免偶发的DOMContentLoaded时机问题
            setTimeout(initApp, 200);
            return;
        }
        console.error('❌ 重试后仍缺少关键DOM元素:', missingCritical);
        showStatus('初始化失败：页面元素不完整', 'error');
        return;
    }
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 自动加载示例数据
    loadExampleData(false);
    
    // 若缺少“生成SVG”按钮，自动生成一次，便于预览
    if (!elements.generateSvgBtn) {
        generateSVG().catch(err => console.error('自动生成SVG失败:', err));
    }

    appInitialized = true;
    console.log('✅ 初始化完成');
    showStatus('应用程序已就绪，可以开始使用', 'success');
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    if (elements.loadExampleBtn) {
        elements.loadExampleBtn.addEventListener('click', () => loadExampleData(true));
    }
    if (elements.generateSvgBtn) {
        elements.generateSvgBtn.addEventListener('click', generateSVG);
    }
    if (elements.downloadSvgBtn) {
        elements.downloadSvgBtn.addEventListener('click', downloadSVG);
    }
    if (elements.downloadPngBtn) {
        elements.downloadPngBtn.addEventListener('click', downloadPNG);
    }
    if (elements.downloadAllBtn) {
        elements.downloadAllBtn.addEventListener('click', downloadAllPages);
    }
    if (elements.generateVideoBtn) {
        elements.generateVideoBtn.addEventListener('click', generateVideo);
    }
    if (elements.prevPageBtn) {
        elements.prevPageBtn.addEventListener('click', showPreviousPage);
    }
    if (elements.nextPageBtn) {
        elements.nextPageBtn.addEventListener('click', showNextPage);
    }
    
    // 输入框变化时重置下载按钮
    if (elements.jsonInput) {
        elements.jsonInput.addEventListener('input', () => {
            if (elements.downloadSvgBtn) elements.downloadSvgBtn.disabled = true;
            if (elements.downloadPngBtn) elements.downloadPngBtn.disabled = true;
        });
    }
}

/**
 * 显示状态消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 ('success' | 'error')
 */
function showStatus(message, type) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message status-${type}`;
    elements.statusMessage.style.display = 'block';
    
    // 3秒后自动隐藏成功消息
    if (type === 'success') {
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 3000);
    }
}

/**
 * 加载示例数据
 * @param {boolean} showNotification - 是否显示通知
 */
function loadExampleData(showNotification = true) {
    try {
        elements.jsonInput.value = JSON.stringify(EXAMPLE_DATA, null, 2);
        
        if (showNotification) {
            showStatus('示例数据已加载，可以点击"生成SVG图表"按钮', 'success');
        }
        
        console.log('📝 示例数据已加载');
    } catch (error) {
        console.error('❌ 加载示例数据失败:', error);
        showStatus('加载示例数据失败', 'error');
    }
}

/**
 * 验证JSON数据格式
 * @param {Object} data - 要验证的数据
 * @returns {Object} 验证结果
 */
function validateData(data) {
    const errors = [];
    
    // 检查必需字段
    if (!data.title_main) errors.push('缺少 title_main 字段');
    if (!data.title_sub) errors.push('缺少 title_sub 字段');
    if (!Array.isArray(data.data)) errors.push('data 字段必须是数组');
    
    // 检查数据数组
    if (data.data && Array.isArray(data.data)) {
        if (data.data.length === 0) {
            errors.push('数据数组不能为空');
        } else {
            data.data.forEach((item, index) => {
                const requiredFields = ['ticker', 'name', 'logo', 'driver', 'change_pct'];
                requiredFields.forEach(field => {
                    if (!item[field]) {
                        errors.push(`第${index + 1}项缺少 ${field} 字段`);
                    }
                });
            });
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 生成SVG图表
 */
async function generateSVG() {
    if (isGenerating) {
        showStatus('正在生成中，请稍候...', 'error');
        return;
    }
    
    try {
        isGenerating = true;
        elements.generateSvgBtn.disabled = true;
        elements.generateSvgBtn.textContent = '🔄 生成中...';
        
        console.log('🎨 开始生成SVG...');
        
        // 获取并解析JSON数据
        const jsonText = elements.jsonInput.value.trim();
        if (!jsonText) {
            throw new Error('请输入JSON数据或点击"加载示例数据"按钮');
        }
        
        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (parseError) {
            throw new Error('JSON格式错误: ' + parseError.message);
        }
        
        // 验证数据格式
        const validation = validateData(data);
        if (!validation.isValid) {
            throw new Error('数据格式错误:\n' + validation.errors.join('\n'));
        }
        
        // 保存当前数据
        currentData = data;
        
        // 重置分页状态
        currentPage = 0;
        svgContents = [];
        
        // 计算总页数（每页最多8个股票）
        const stocksPerPage = 7;
        totalPages = Math.ceil(data.data.length / stocksPerPage);
        
        // 生成所有页面的SVG内容
        for (let page = 0; page < totalPages; page++) {
            const startIndex = page * stocksPerPage;
            const endIndex = Math.min(startIndex + stocksPerPage, data.data.length);
            const pageData = {
                title_main: data.title_main,
                title_sub: data.title_sub,
                data: data.data.slice(startIndex, endIndex)
            };
            
            // 生成当前页的SVG内容
            const svgContent = await createSVG(pageData);
            svgContents.push(svgContent);
        }
        
        // 显示第一页SVG
        elements.svgContainer.innerHTML = svgContents[0];
        elements.svgContainer.classList.add('has-content');
        
        // 更新分页控制
        updatePaginationControls();
        
        // 启用下载按钮和视频生成按钮
        elements.downloadSvgBtn.disabled = false;
        elements.downloadPngBtn.disabled = false;
        elements.downloadAllBtn.disabled = false;
        elements.generateVideoBtn.disabled = false;
        
        console.log(`✅ 成功生成 ${totalPages} 页SVG`);
        showStatus(`成功生成 ${totalPages} 页SVG图表！`, 'success');
        
    } catch (error) {
        console.error('❌ 生成SVG失败:', error);
        showStatus(error.message, 'error');
    } finally {
        isGenerating = false;
        elements.generateSvgBtn.disabled = false;
        elements.generateSvgBtn.textContent = '🎨 生成SVG图表';
    }
}

/**
 * 将远程图片转换为base64
 * @param {string} url - 图片URL
 * @returns {Promise<string|null>} base64编码的图片或null
 */
async function imageUrlToBase64(url) {
    // 检查URL是否为空或无效
    if (!url || url.trim() === '') {
        console.log('图片URL为空，返回null');
        return null;
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法获取图片: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`转换图片失败: ${url}`, error);
        // 返回null表示没有有效的图片
        return null;
    }
}

/**
 * 创建SVG内容
 * @param {Object} data - 股票数据
 * @returns {string} SVG内容
 */
async function createSVG(data) {
    const width = 1180;
    const height = 2080;
    const maxRows = 8; // 每页最多显示8个股票
    const displayData = data.data.slice(0, maxRows); // 限制显示的数据行数
    
    // 预处理所有logo图片
    const logoPromises = displayData.map(item => {
        if (item.logo && item.logo.trim() !== '') {
            return imageUrlToBase64(item.logo);
        } else {
            // 返回null表示没有logo
            return Promise.resolve(null);
        }
    });
    const logoBase64Array = await Promise.all(logoPromises);
    
    // 加载背景图并转换为base64
    let backgroundImage = '';
    try {
        // 使用相对路径，确保能正确加载
        const bgImagePath = './0912-1.jpg';
        
        // 尝试将背景图转换为base64（异步操作）
        const bgImageResponse = await fetch(bgImagePath);
        if (bgImageResponse.ok) {
            const bgImageBlob = await bgImageResponse.blob();
            const bgImageBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(bgImageBlob);
            });
            backgroundImage = bgImageBase64;
        } else {
            console.error(`无法获取背景图: ${bgImageResponse.status} ${bgImageResponse.statusText}`);
            backgroundImage = bgImagePath; // 降级为相对路径
        }
    } catch (error) {
        console.error('背景图加载失败:', error);
        // 使用相对路径作为备选
        backgroundImage = './0912-1.jpg';
    }
    
    let svgContent = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <!-- 深色背景 -->
            <rect width="${width}" height="${height}" fill="#1a1d21"/>
            
            <!-- 背景图片 -->
            ${backgroundImage ? `<image href="${backgroundImage}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>` : ''}
    `;
    
    // 添加标题
    svgContent += `
        <!-- 标题区域 -->
        <g>
            <!-- 日期标题 -->
            <text x="92" y="345" font-family="Arial, sans-serif" font-size="90" font-weight="bold" fill="#FFFFFF" text-anchor="start">
                ${escapeXml(data.title_main)}
            </text>
            
            <!-- 副标题 -->
            <text x="92" y="455" font-family="Arial, sans-serif" font-size="90" font-weight="bold" fill="#7FF9C1" text-anchor="start">
                ${escapeXml(data.title_sub)}
            </text>
        </g>
    `;
    
    // 添加表头
    const tableStartY = 501;
    // 延后添加表头以保证层级在外层容器之上（将在计算完行高后再绘制）
    svgContent += `
        <!-- 表头背景 -->
        <rect x="${(width - 1040)/2}" y="${tableStartY}" width="1040" height="55" fill="#7FF9C1" rx="10"/>
        
        <!-- 表头文字 -->
        <text x="101" y="${tableStartY + 39}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#002C18">Ticker</text>
        <text x="435" y="${tableStartY + 39}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#002C18">Driver</text>
        <text x="1070" y="${tableStartY + 39}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#002C18" text-anchor="end">Intraday %</text>
    `;
    
    // 数据行配置
    const actualRows = displayData.length;
    const firstRowY = tableStartY + 55; // 取消表头与第一行之间的间距（原604）
    const baseRowHeight = 142;
    const rowPositions = [];
    const rowHeights = [];
    
    // 预处理每行文本，计算驱动原因的行数
    const textLinesInfo = displayData.map(item => {
        // 处理驱动原因文本
        const maxLineLength = 30; // 每行最多字符数
        const maxDriverLength = 200; // 最大总字符数
        
        // 限制总字符数
        let driverText = item.driver.length > maxDriverLength ? item.driver.substring(0, maxDriverLength) + '...' : item.driver;
        
        // 将驱动原因文本分割成多行
        let driverLines = [];
        let remainingText = driverText;
        
        while (remainingText.length > 0) {
            // 如果剩余文本长度小于等于最大行长度，直接添加
            if (remainingText.length <= maxLineLength) {
                driverLines.push(remainingText);
                break;
            }
            
            // 找到适合断行的位置（空格）
            let splitIndex = maxLineLength;
            
            // 向前查找空格
            while (splitIndex > 0 && remainingText.charAt(splitIndex) !== ' ') {
                splitIndex--;
            }
            
            // 如果找不到空格，尝试向后查找
            if (splitIndex === 0) {
                splitIndex = maxLineLength;
                while (splitIndex < remainingText.length && remainingText.charAt(splitIndex) !== ' ') {
                    splitIndex++;
                }
                
                // 如果仍然找不到空格，强制在最大行长度处截断
                if (splitIndex === remainingText.length) {
                    splitIndex = maxLineLength;
                }
            }
            
            // 添加当前行并更新剩余文本
            driverLines.push(remainingText.substring(0, splitIndex).trim());
            remainingText = remainingText.substring(splitIndex).trim();
            
            // 限制最多显示4行
            if (driverLines.length >= 4 && remainingText.length > 0) {
                // 在最后一行添加省略号
                driverLines[3] = driverLines[3].substring(0, driverLines[3].length - 3) + '...';
                break;
            }
        }
        
        // 返回驱动原因的行数信息
        return {
            driverLines: driverLines.length
        };
    });
    
    // 动态生成行位置和高度 - 根据驱动原因的行数调整
    let currentY = firstRowY;
    for (let i = 0; i < actualRows; i++) {
        // 获取驱动原因的行数
        const driverLineCount = textLinesInfo[i].driverLines;
        
        // 计算需要增加的高度（去掉旧注释和重复定义）
        const additionalHeight = driverLineCount > 2 ? (driverLineCount - 2) * 41 : 0;
        const currentRowHeight = baseRowHeight + additionalHeight;
        
        rowPositions.push(currentY);
        rowHeights.push(currentRowHeight);
        
        // 更新下一行的起始位置
        currentY += currentRowHeight;
    }

    // 表格整体容器（外层圆角卡片）
    const totalRowsHeight = rowHeights.reduce((acc, h) => acc + h, 0);
    svgContent += `
        <!-- 表格整体容器（外层圆角） -->
        <rect x="${(width - 1040)/2}" y="${tableStartY}" width="1040" height="${55 + totalRowsHeight}" rx="16" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1"/>
    `;

    // 表头（绘制在容器之上）
    svgContent += `
        <!-- 表头背景 -->
        <rect x="${(width - 1040)/2}" y="${tableStartY}" width="1040" height="55" fill="#7FF9C1" rx="10"/>
        
        <!-- 表头文字 -->
        <text x="101" y="${tableStartY + 39}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#002C18">Ticker</text>
        <text x="435" y="${tableStartY + 39}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#002C18">Driver</text>
        <text x="1070" y="${tableStartY + 39}" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#002C18" text-anchor="end">Intraday %</text>
    `;

    // 斑马条纹行背景（去掉每行圆角，颜色白/灰间隔）
    for (let i = 0; i < actualRows; i++) {
        const rowFill = i % 2 === 0 ? '#FFFFFF' : '#F3F4F6';
        const x = (width - 1040) / 2;
        const y = rowPositions[i];
        const w = 1040;
        const h = rowHeights[i];
        const isLast = i === actualRows - 1;
        if (!isLast) {
            svgContent += `
                <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${rowFill}"/>
            `;
        } else {
            // 为最后一条添加底部两个角 10px 圆角
            svgContent += `
                <path d="M ${x} ${y} H ${x + w} V ${y + h - 10} 
                     Q ${x + w} ${y + h} ${x + w - 10} ${y + h}
                     H ${x + 10}
                     Q ${x} ${y + h} ${x} ${y + h - 10}
                     V ${y} Z" fill="${rowFill}"/>
            `;
        }
    }
    
    // 移除深灰覆盖层，保持斑马条纹与白色容器即可
    // 此处不再添加半透明背景矩形
    
    // 添加数据行
    for (let i = 0; i < actualRows; i++) {
        const item = displayData[i];
        const y = rowPositions[i];
        
        // 计算行内容的垂直中心点（取消旧的位移与行间距）
        const rowCenterY = rowPositions[i] + rowHeights[i] / 2;
        // 基线位置：与左侧股票代码保持一致（rowCenterY - 1）
        const baseLineY = rowCenterY + 3;
        // 公司logo (圆形)
        const logoSize = 96;
        const logoX = 94;
        const logoY = rowCenterY - logoSize/2; // 取消额外下移
        
        if (logoBase64Array[i]) {
            // 有Logo的情况
            svgContent += `
                <!-- Logo背景圆 -->
                <circle cx="${logoX + logoSize/2}" cy="${logoY + logoSize/2}" r="${logoSize/2}" fill="#D9D9D9"/>
                
                <!-- 圆形裁剪定义 -->
                <defs>
                    <clipPath id="logoClip${i}">
                        <circle cx="${logoX + logoSize/2}" cy="${logoY + logoSize/2}" r="${logoSize/2}"/>
                    </clipPath>
                </defs>
                
                <!-- 公司Logo (圆形裁剪) -->
                <image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" 
                       href="${logoBase64Array[i]}" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip${i})"/>
            `;
        } else {
            // 没有Logo的情况，使用蓝色背景+公司代码替代
            svgContent += `
                <!-- 蓝色背景圆 -->
                <circle cx="${logoX + logoSize/2}" cy="${logoY + logoSize/2}" r="${logoSize/2}" fill="#1E90FF"/>
                
                <!-- 公司代码文本 -->
                <text x="${logoX + logoSize/2}" y="${logoY + logoSize/2}" font-family="Arial, sans-serif" 
                      font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">
                    ${escapeXml(item.ticker)}
                </text>
            `;
        }
        
        // 股票代码
        svgContent += `
            <!-- 股票代码 -->
            <text x="205" y="${baseLineY - 10}" font-family="Arial, sans-serif" 
                  font-size="32" font-weight="bold" fill="#111827">
                ${escapeXml(item.ticker)}
            </text>
        `;
        
        // 公司名称 - 过长时使用省略号
        const maxCompanyNameLength = 12; // 最大字符数
        
        // 截断过长的公司名称并添加省略号
        let companyName = item.name.length > maxCompanyNameLength ? 
            item.name.substring(0, maxCompanyNameLength) + '...' : item.name;
        
        // 生成SVG文本元素
        svgContent += `
            <!-- 公司名称 -->
            <text x="205" y="${rowCenterY + 25 + 14 - 10}" font-family="Arial, sans-serif" 
                  font-size="28" font-weight="normal" fill="#6B7280">
                ${escapeXml(companyName)}
            </text>
        `;
        
        // 异动原因 - 使用预处理计算的行数和文本分割
        const maxLineLength = 30; // 每行最多字符数
        const maxDriverLength = 200; // 最大总字符数
        const lineHeight = 41; // 行高
        
        // 限制总字符数
        let driverText = item.driver.length > maxDriverLength ? item.driver.substring(0, maxDriverLength) + '...' : item.driver;
        
        // 将文本分割成多行
        let lines = [];
        let remainingText = driverText;
        
        while (remainingText.length > 0) {
            // 如果剩余文本长度小于等于最大行长度，直接添加
            if (remainingText.length <= maxLineLength) {
                lines.push(remainingText);
                break;
            }
            
            // 找到适合断行的位置（空格）
            let splitIndex = maxLineLength;
            
            // 向前查找空格
            while (splitIndex > 0 && remainingText.charAt(splitIndex) !== ' ') {
                splitIndex--;
            }
            
            // 如果找不到空格，尝试向后查找
            if (splitIndex === 0) {
                splitIndex = maxLineLength;
                while (splitIndex < remainingText.length && remainingText.charAt(splitIndex) !== ' ') {
                    splitIndex++;
                }
                
                // 如果仍然找不到空格，强制在最大行长度处截断
                if (splitIndex === remainingText.length) {
                    splitIndex = maxLineLength;
                }
            }
            
            // 添加当前行并更新剩余文本
            lines.push(remainingText.substring(0, splitIndex).trim());
            remainingText = remainingText.substring(splitIndex).trim();
            
            // 限制最多显示4行
            if (lines.length >= 4 && remainingText.length > 0) {
                // 在最后一行添加省略号
                lines[3] = lines[3].substring(0, lines[3].length - 3) + '...';
                break;
            }
        }
        
        // 获取预处理计算的驱动原因行数
        const driverLineCount = textLinesInfo[i].driverLines;
        // 计算驱动原因文本块居中到“股票代码”和“公司名称”之间的起始Y
        const tickerBaselineY = baseLineY - 10;
        const nameBaselineY = rowCenterY + 25 + 14 - 10;
        const gapMidY = (tickerBaselineY + nameBaselineY) / 2;
        const driverStartY = gapMidY - ((lines.length - 1) * lineHeight) / 2;
        
        // 生成SVG文本元素 - 根据行数调整垂直位置
        svgContent += `
            <!-- 异动原因 -->
            <text x="435" y="${driverStartY}" font-family="Arial, sans-serif" 
                  font-size="31" font-weight="normal" fill="#111827">`;
        // 添加每一行文本
        lines.forEach((line, index) => {
            const dy = index === 0 ? '0' : lineHeight;
            svgContent += `                <tspan x="435" dy="${dy}">${escapeXml(line)}</tspan>\n`;
        });
        svgContent += `            </text>
        `;
        // 涨跌幅 - 顶对齐到股票代码
        const changeColor = item.change_pct.startsWith('+') ? '#1FBB73' : '#FF6B6B';
        svgContent += `
            <!-- 涨跌幅 -->
            <text x="1070" y="${baseLineY - 10}" font-family="Arial, sans-serif" 
                  font-size="32" font-weight="bold" fill="${changeColor}" text-anchor="end">
                ${escapeXml(item.change_pct)}
            </text>
        `;
    }
    
    svgContent += '</svg>';
    
    return svgContent;
}

/**
 * 转义XML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeXml(text) {
    if (typeof text !== 'string') return text;
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 更新分页控制
 */
function updatePaginationControls() {
    if (totalPages <= 1) {
        elements.paginationContainer.style.display = 'none';
        return;
    }
    
    // 显示分页控制
    elements.paginationContainer.style.display = 'flex';
    
    // 更新页码指示器
    elements.pageIndicator.textContent = `第 ${currentPage + 1} 页，共 ${totalPages} 页`;
    
    // 更新按钮状态
    elements.prevPageBtn.disabled = currentPage === 0;
    elements.nextPageBtn.disabled = currentPage === totalPages - 1;
}

/**
 * 显示上一页
 */
function showPreviousPage() {
    if (currentPage > 0) {
        currentPage--;
        elements.svgContainer.innerHTML = svgContents[currentPage];
        updatePaginationControls();
    }
}

/**
 * 显示下一页
 */
function showNextPage() {
    if (currentPage < totalPages - 1) {
        currentPage++;
        elements.svgContainer.innerHTML = svgContents[currentPage];
        updatePaginationControls();
    }
}

/**
 * 下载SVG文件
 */
function downloadSVG() {
    try {
        const svgElement = elements.svgContainer.querySelector('svg');
        if (!svgElement) {
            throw new Error('没有可下载的SVG内容');
        }
        
        // 克隆SVG元素以避免修改原始元素
        const svgClone = svgElement.cloneNode(true);
        
        // 确保所有图片都已嵌入
        const images = svgClone.querySelectorAll('image');
        if (images.length > 0) {
            console.log(`处理SVG中的${images.length}个图片...`);
        }
        
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `异动解读_${currentData?.title_main || 'chart'}_第${currentPage + 1}页.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        console.log('📥 SVG文件下载成功');
        showStatus('SVG文件下载成功', 'success');
        
    } catch (error) {
        console.error('❌ 下载SVG失败:', error);
        showStatus('下载失败: ' + error.message, 'error');
    }
}

/**
 * 导出PNG图片
 */
async function downloadPNG() {
    try {
        const svgElement = elements.svgContainer.querySelector('svg');
        if (!svgElement) {
            throw new Error('没有可导出的SVG内容');
        }
        
        elements.downloadPngBtn.disabled = true;
        elements.downloadPngBtn.textContent = '🔄 导出中...';
        
        // 创建canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 获取SVG尺寸
        const svgRect = svgElement.getBoundingClientRect();
        const svgWidth = parseInt(svgElement.getAttribute('width')) || svgRect.width;
        const svgHeight = parseInt(svgElement.getAttribute('height')) || svgRect.height;
        
        // 设置canvas尺寸（高分辨率）
        const scale = 2;
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        ctx.scale(scale, scale);
        
        // 将SVG转换为图片
        // 克隆SVG元素以避免修改原始元素
        const svgClone = svgElement.cloneNode(true);
        
        // 确保所有图片都已嵌入
        const images = svgClone.querySelectorAll('image');
        if (images.length > 0) {
            console.log(`处理PNG导出中的${images.length}个图片...`);
        }
        
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const img = new Image();
        
        await new Promise((resolve, reject) => {
            img.onload = () => {
                ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                resolve();
            };
            img.onerror = (e) => {
                console.error('SVG转换为图片失败', e);
                reject(new Error('SVG转换为图片失败'));
            };
            
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            img.src = URL.createObjectURL(blob);
        });
        
        // 下载PNG
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `异动解读_${currentData?.title_main || 'chart'}_第${currentPage + 1}页.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('📥 PNG文件导出成功');
            showStatus(`第 ${currentPage + 1} 页 PNG文件导出成功`, 'success');
        }, 'image/png', 0.95);
        
    } catch (error) {
        console.error('❌ 导出PNG失败:', error);
        showStatus('导出失败: ' + error.message, 'error');
    } finally {
        elements.downloadPngBtn.disabled = false;
        elements.downloadPngBtn.textContent = '🖼️ 导出PNG图片';
    }
}

/**
 * 下载所有页面
 */
async function downloadAllPages() {
    try {
        if (!svgContents || svgContents.length === 0) {
            throw new Error('没有可下载的内容');
        }
        
        elements.downloadAllBtn.disabled = true;
         elements.downloadAllBtn.textContent = '🔄 导出中...';
        
        showStatus(`开始导出所有 ${totalPages} 页...`, 'success');
        
        // 创建一个zip文件
        const zip = new JSZip();
        const svgFolder = zip.folder("svg");
        const pngFolder = zip.folder("png");
        
        // 添加所有SVG文件到zip
        for (let i = 0; i < svgContents.length; i++) {
            const svgContent = svgContents[i];
            svgFolder.file(`异动解读_${currentData?.title_main || 'chart'}_第${i + 1}页.svg`, svgContent);
            
            // 创建临时SVG元素
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = svgContent;
            const svgElement = tempDiv.querySelector('svg');
            
            // 转换SVG为PNG并添加到zip
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 获取SVG尺寸
            const svgWidth = parseInt(svgElement.getAttribute('width'));
            const svgHeight = parseInt(svgElement.getAttribute('height'));
            
            // 设置canvas尺寸（高分辨率）
            const scale = 2;
            canvas.width = svgWidth * scale;
            canvas.height = svgHeight * scale;
            ctx.scale(scale, scale);
            
            // 将SVG转换为图片
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const img = new Image();
            
            await new Promise((resolve) => {
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
                    
                    // 将canvas转换为blob并添加到zip
                    canvas.toBlob((blob) => {
                        pngFolder.file(`异动解读_${currentData?.title_main || 'chart'}_第${i + 1}页.png`, blob);
                        resolve();
                    }, 'image/png', 0.95);
                };
                
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                img.src = URL.createObjectURL(blob);
            });
            
            // 更新状态
            showStatus(`处理中: ${i + 1}/${totalPages} 页`, 'success');
        }
        
        // 生成并下载zip文件
        const zipContent = await zip.generateAsync({type: 'blob'});
        const url = URL.createObjectURL(zipContent);
        const link = document.createElement('a');
        link.href = url;
        link.download = `异动解读_${currentData?.title_main || 'chart'}_全部页面.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('📥 所有页面导出成功');
        showStatus('所有页面导出成功', 'success');
        
    } catch (error) {
        console.error('❌ 导出所有页面失败:', error);
        showStatus('导出失败: ' + error.message, 'error');
    } finally {
         elements.downloadAllBtn.disabled = false;
         elements.downloadAllBtn.textContent = '下载所有页面';
     }
}

/**
 * 生成视频（使用静态图片幻灯片方式）
 */
async function generateVideo() {
    try {
        if (!svgContents || svgContents.length === 0) {
            throw new Error('没有可用于生成视频的内容');
        }
        
        elements.generateVideoBtn.disabled = true;
        elements.generateVideoBtn.textContent = '🔄 生成中...';
        
        showStatus('正在生成幻灯片，请稍候...', 'info');
        
        // 清空视频容器
        elements.videoContainer.innerHTML = '';
        elements.videoContainer.style.display = 'block';
        elements.videoContainer.style.width = '100%';
        elements.videoContainer.style.maxWidth = '800px';
        elements.videoContainer.style.margin = '20px auto';
        elements.videoContainer.style.padding = '10px';
        elements.videoContainer.style.backgroundColor = '#f5f5f5';
        elements.videoContainer.style.borderRadius = '5px';
        elements.videoContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        console.log('幻灯片容器已准备好');
        
        // 创建一个专用的播放区域
        const presentationArea = document.createElement('div');
        presentationArea.id = 'presentation-area';
        presentationArea.style.position = 'relative';
        presentationArea.style.backgroundColor = '#1a1d21';
        presentationArea.style.overflow = 'hidden';
        presentationArea.style.margin = '0 auto';
        elements.videoContainer.appendChild(presentationArea);
        
        // 加载第一页SVG以获取尺寸
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgContents[0];
        const svgElement = tempDiv.querySelector('svg');
        
        // 获取SVG尺寸
        const svgWidth = parseInt(svgElement.getAttribute('width'));
        const svgHeight = parseInt(svgElement.getAttribute('height'));
        
        // 设置播放区域尺寸
        presentationArea.style.width = `${svgWidth}px`;
        presentationArea.style.height = `${svgHeight}px`;
        presentationArea.style.maxWidth = '100%';
        
        // 创建控制按钮容器
        const controlsContainer = document.createElement('div');
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'center';
        controlsContainer.style.margin = '10px 0';
        controlsContainer.style.gap = '10px';
        elements.videoContainer.appendChild(controlsContainer);
        
        // 创建播放按钮
        const playButton = document.createElement('button');
        playButton.textContent = '▶️ 播放';
        playButton.className = 'btn-primary';
        playButton.style.padding = '8px 16px';
        controlsContainer.appendChild(playButton);
        
        // 创建下载按钮（将在幻灯片生成后启用）
        const downloadButton = document.createElement('button');
        downloadButton.textContent = '⬇️ 下载图片';
        downloadButton.className = 'btn-success';
        downloadButton.style.padding = '8px 16px';
        downloadButton.disabled = true;
        controlsContainer.appendChild(downloadButton);
        
        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '✖️ 关闭';
        closeButton.className = 'btn-warning';
        closeButton.style.padding = '8px 16px';
        closeButton.onclick = () => {
            elements.videoContainer.style.display = 'none';
        };
        controlsContainer.appendChild(closeButton);
        
        // 准备幻灯片
        let currentSlideIndex = 0;
        let slideInterval = null;
        let isPlaying = false;
        const slides = [];
        const slideDuration = 3000; // 每张幻灯片显示3秒
        
        // 设置幻灯片显示时间
        const transitionTime = 500; // 过渡动画时间500毫秒
        
        // 加载背景音乐
        const audio = new Audio('BGM.MP3');
        
        // 创建幻灯片容器
        const slidesContainer = document.createElement('div');
        slidesContainer.style.width = '100%';
        slidesContainer.style.height = '100%';
        slidesContainer.style.position = 'relative';
        presentationArea.appendChild(slidesContainer);
        
        // 创建幻灯片导航指示器
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.style.position = 'absolute';
        indicatorsContainer.style.bottom = '10px';
        indicatorsContainer.style.left = '0';
        indicatorsContainer.style.right = '0';
        indicatorsContainer.style.display = 'flex';
        indicatorsContainer.style.justifyContent = 'center';
        indicatorsContainer.style.gap = '5px';
        indicatorsContainer.style.zIndex = '10';
        presentationArea.appendChild(indicatorsContainer);
        
        // 准备所有幻灯片
        console.log(`开始准备幻灯片，总页数: ${totalPages}`);
        
        for (let i = 0; i < totalPages; i++) {
            // 创建幻灯片元素
            const slide = document.createElement('div');
            slide.className = 'slide';
            slide.style.position = 'absolute';
            slide.style.top = '0';
            slide.style.left = '0';
            slide.style.width = '100%';
            slide.style.height = '100%';
            slide.style.opacity = i === 0 ? '1' : '0';
            slide.style.transition = `opacity ${transitionTime}ms ease-in-out`;
            slidesContainer.appendChild(slide);
            
            // 创建导航指示器
            const indicator = document.createElement('div');
            indicator.style.width = '10px';
            indicator.style.height = '10px';
            indicator.style.borderRadius = '50%';
            indicator.style.backgroundColor = i === 0 ? '#fff' : '#aaa';
            indicator.style.cursor = 'pointer';
            indicator.onclick = () => showSlide(i);
            indicatorsContainer.appendChild(indicator);
            
            // 将SVG内容添加到幻灯片
            slide.innerHTML = svgContents[i];
            
            // 保存幻灯片引用
            slides.push({
                element: slide,
                indicator: indicator
            });
        }
            
        // 将SVG转换为图片
        
        // 定义幻灯片控制函数
        function showSlide(index) {
            if (index < 0 || index >= slides.length) return;
            
            // 更新当前幻灯片索引
            currentSlideIndex = index;
            
            // 更新所有幻灯片显示状态
            slides.forEach((slide, i) => {
                slide.element.style.opacity = i === index ? '1' : '0';
                slide.indicator.style.backgroundColor = i === index ? '#fff' : '#aaa';
            });
        }
        
        // 播放幻灯片函数
        function playSlides() {
            if (isPlaying) return;
            
            isPlaying = true;
            playButton.textContent = '⏸️ 暂停';
            
            // 播放背景音乐
            audio.currentTime = 0;
            audio.play().catch(err => console.log('播放音乐失败:', err));
            
            // 开始幻灯片自动播放
            slideInterval = setInterval(() => {
                currentSlideIndex = (currentSlideIndex + 1) % slides.length;
                showSlide(currentSlideIndex);
                
                // 如果播放到最后一张，停止自动播放
                if (currentSlideIndex === slides.length - 1) {
                    pauseSlides();
                }
            }, slideDuration);
        }
        
        // 暂停幻灯片函数
        function pauseSlides() {
            if (!isPlaying) return;
            
            isPlaying = false;
            playButton.textContent = '▶️ 播放';
            
            // 暂停背景音乐
            audio.pause();
            
            // 清除定时器
            if (slideInterval) {
                clearInterval(slideInterval);
                slideInterval = null;
            }
        }
        
        // 下载幻灯片函数
        async function downloadSlides() {
            try {
                // 创建一个zip文件
                const zip = new JSZip();
                
                // 添加每张幻灯片到zip
                for (let i = 0; i < totalPages; i++) {
                    const svgContent = svgContents[i];
                    zip.file(`slide_${i+1}.svg`, svgContent);
                }
                
                // 生成zip文件并下载
                const zipBlob = await zip.generateAsync({type: 'blob'});
                const zipUrl = URL.createObjectURL(zipBlob);
                
                const downloadLink = document.createElement('a');
                downloadLink.href = zipUrl;
                downloadLink.download = '异动解读幻灯片.zip';
                downloadLink.click();
                
                URL.revokeObjectURL(zipUrl);
                showStatus('幻灯片已下载', 'success');
            } catch (error) {
                console.error('下载幻灯片失败:', error);
                showStatus('下载幻灯片失败: ' + error.message, 'error');
            }
        }
        // 添加按钮事件监听器
        playButton.onclick = () => {
            if (isPlaying) {
                pauseSlides();
            } else {
                playSlides();
            }
        };
        
        // 添加下载按钮事件监听器
        downloadButton.onclick = downloadSlides;
        
        // 启用下载按钮
        downloadButton.disabled = false;
        
        // 完成幻灯片准备
        // 显示成功状态
        showStatus('幻灯片生成成功！', 'success');
        
        // 恢复按钮状态
        elements.generateVideoBtn.disabled = false;
        elements.generateVideoBtn.textContent = '生成幻灯片';
        
        return;
    } catch (error) {
        console.error('生成幻灯片时出错:', error);
        showStatus('生成幻灯片失败: ' + error.message, 'error');
        
        // 恢复按钮状态
        elements.generateVideoBtn.disabled = false;
        elements.generateVideoBtn.textContent = '生成幻灯片';
        
        return;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);

// 导出函数到全局作用域（用于调试）
window.MoversGenerator = {
    initApp,
    loadExampleData,
    generateSVG,
    downloadSVG,
    downloadPNG,
    currentData: () => currentData
};

console.log('📦 异动解读SVG生成器脚本已加载');