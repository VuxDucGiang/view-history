const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'history.json');
const OUTPUT_SVG = path.join(__dirname, '..', 'charts', 'view-history.svg');

function generateSVG() {
  console.log('[View History Generator] Reading data from history.json...');

  if (!fs.existsSync(DATA_FILE)) {
    console.error('[View History Generator] Error: data/history.json does not exist.');
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(rawData);
  const views = data.views || [];
  const repoName = data.repository || 'VuxDucGiang/view-history';

  // SVG Canvas Configuration - Star History Classic Style
  const width = 800;
  const height = 500;

  const paddingLeft = 90;
  const paddingRight = 50;
  const paddingTop = 70;
  const paddingBottom = 75;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  if (views.length === 0) {
    console.warn('[View History Generator] Warning: No view entries found.');
    return;
  }

  // Find Y axis bounds
  const maxVal = Math.max(...views.map(v => Math.max(v.count, v.uniques)), 10);
  // Round up to nice number
  const yUpper = Math.ceil(maxVal * 1.25 / 10) * 10 || 100;

  // Helper for coordinates
  const getX = (index) => paddingLeft + (index / Math.max(views.length - 1, 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - (val / yUpper) * chartHeight;

  // Points for lines
  const countPoints = views.map((v, i) => ({ x: getX(i), y: getY(v.count) }));
  const uniquePoints = views.map((v, i) => ({ x: getX(i), y: getY(v.uniques) }));

  function createPath(points) {
    if (points.length === 0) return '';
    let pathStr = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      pathStr += ` C ${cpX.toFixed(1)} ${curr.y.toFixed(1)}, ${cpX.toFixed(1)} ${next.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return pathStr;
  }

  const countPathD = createPath(countPoints);
  const uniquePathD = createPath(uniquePoints);

  // Y-Axis Ticks & Grid Lines
  const yTickCount = 5;
  let yTicksHtml = '';
  for (let i = 0; i <= yTickCount; i++) {
    const val = Math.round((yUpper / yTickCount) * i);
    const yPos = getY(val);

    // Format numbers (e.g. 1K, 500)
    let labelVal = val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toString();

    // Axis Tick
    yTicksHtml += `<line x1="${paddingLeft - 6}" y1="${yPos}" x2="${paddingLeft}" y2="${yPos}" stroke="#000000" stroke-width="2"/>`;
    // Grid line (light dashed)
    yTicksHtml += `<line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="3 3"/>`;
    // Text Label
    yTicksHtml += `<text x="${paddingLeft - 14}" y="${yPos + 5}" fill="#000000" font-family="'Comic Sans MS', 'Comic Neue', Chalkboard, sans-serif" font-size="15" font-weight="600" text-anchor="end">${labelVal}</text>`;
  }

  // X-Axis Ticks & Date Labels
  let xTicksHtml = '';
  const labelStep = Math.max(1, Math.floor(views.length / 6));
  views.forEach((v, i) => {
    if (i % labelStep === 0 || i === views.length - 1) {
      const dateObj = new Date(v.timestamp);
      const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      const xPos = getX(i);
      xTicksHtml += `<line x1="${xPos}" y1="${paddingTop + chartHeight}" x2="${xPos}" y2="${paddingTop + chartHeight + 6}" stroke="#000000" stroke-width="2"/>`;
      xTicksHtml += `<text x="${xPos}" y="${paddingTop + chartHeight + 26}" fill="#000000" font-family="'Comic Sans MS', 'Comic Neue', Chalkboard, sans-serif" font-size="14" font-weight="600" text-anchor="middle">${dateStr}</text>`;
    }
  });

  const fontStyle = `'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Comic Sans', sans-serif`;

  // Top-Left Legend Box (Star History Signature Style)
  const labelViews = `${repoName} (Views)`;
  const labelUniques = `${repoName} (Uniques)`;
  const maxLabelLen = Math.max(labelViews.length, labelUniques.length);
  const legendBoxWidth = Math.max(260, maxLabelLen * 9.5 + 45);

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <style>
    .star-title { font-family: ${fontStyle}; font-size: 26px; font-weight: 700; fill: #000000; }
    .axis-label { font-family: ${fontStyle}; font-size: 16px; font-weight: 700; fill: #000000; }
    .legend-text { font-family: ${fontStyle}; font-size: 14px; font-weight: 600; fill: #000000; }
    .watermark-text { font-family: ${fontStyle}; font-size: 14px; font-weight: 600; fill: #4b5563; }
  </style>

  <!-- Background Box (Light Theme Star History Style) -->
  <rect width="${width}" height="${height}" rx="20" ry="20" fill="#fcfcfc" stroke="#000000" stroke-width="3"/>

  <!-- Centered Title -->
  <text x="${width / 2}" y="42" class="star-title" text-anchor="middle">View History</text>

  <!-- Y Axis Label (Rotated on the left) -->
  <text x="${- (paddingTop + chartHeight / 2)}" y="32" class="axis-label" text-anchor="middle" transform="rotate(-90)">GitHub Views</text>

  <!-- X Axis Label (Centered at bottom) -->
  <text x="${paddingLeft + chartWidth / 2}" y="${height - 20}" class="axis-label" text-anchor="middle">Date</text>

  <!-- Y Grid & Labels -->
  <g>${yTicksHtml}</g>

  <!-- X Ticks & Labels -->
  <g>${xTicksHtml}</g>

  <!-- Main Chart Box Axes (Black Lines) -->
  <polyline points="${paddingLeft},${paddingTop} ${paddingLeft},${paddingTop + chartHeight} ${width - paddingRight},${paddingTop + chartHeight}" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Total Views Line (Star-History Blue #3b82f6) -->
  <path d="${countPathD}" fill="none" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Unique Visitors Line (Star-History Yellow/Gold #ea0808ff) -->
  <path d="${uniquePathD}" fill="none" stroke="#ea0808ff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Top-Left Legend Box (Star History Signature Style) -->
  <g transform="translate(${paddingLeft + 15}, ${paddingTop + 15})">
    <!-- Legend Container Box -->
    <rect width="${legendBoxWidth}" height="72" rx="8" fill="#ffffff" stroke="#000000" stroke-width="2"/>
    
    <!-- Item 1: Total Views -->
    <rect x="12" y="14" width="14" height="14" rx="2" fill="#3b82f6" stroke="#000000" stroke-width="1.5"/>
    <text x="34" y="26" class="legend-text">${labelViews}</text>

    <!-- Item 2: Unique Visitors -->
    <rect x="12" y="42" width="14" height="14" rx="2" fill="#eab308" stroke="#000000" stroke-width="1.5"/>
    <text x="34" y="54" class="legend-text">${labelUniques}</text>
  </g>

  <!-- Bottom Right Star-History Style Watermark -->
  <g transform="translate(${width - paddingRight - 130}, ${height - 24})">
    <!-- Icon -->
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="none" stroke="#10b981" stroke-width="2.5" transform="scale(0.7) translate(-4, -6)"/>
    <text x="18" y="10" class="watermark-text">view-history</text>
  </g>
</svg>`;

  const outputDir = path.dirname(OUTPUT_SVG);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_SVG, svgContent, 'utf8');
  console.log(`[View History Generator] Successfully created Star-History style SVG chart at: ${OUTPUT_SVG}`);
}

generateSVG();
