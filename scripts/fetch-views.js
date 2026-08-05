const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'history.json');
const TARGET_REPO = process.env.TARGET_REPO || process.env.GITHUB_REPOSITORY || 'VuxDucGiang/view-history';
const TOKEN = process.env.GH_PAT || process.env.GITHUB_TOKEN;

async function fetchTrafficViews() {
  console.log(`[View History] Fetching traffic views for ${TARGET_REPO}...`);

  if (!TOKEN) {
    console.warn('[View History] Warning: No GH_PAT or GITHUB_TOKEN provided. Skipping API fetch and preserving current data.');
    return;
  }

  const [owner, repo] = TARGET_REPO.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/traffic/views`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'GitHub-View-History-Tracker'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 403 && errText.includes("Resource not accessible by integration")) {
        throw new Error(
          `GitHub API Error (403): GitHub không cho phép sử dụng GITHUB_TOKEN mặc định để lấy Traffic API.\n` +
          `=> BẠN CẦN TẠO PERSONAL ACCESS TOKEN (PAT) VÀ THÊM VÀO REPOSITORY SECRETS VỚI TÊN 'GH_PAT'.`
        );
      }
      throw new Error(`GitHub API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const fetchedViews = data.views || [];
    console.log(`[View History] Fetched ${fetchedViews.length} data points from GitHub API.`);

    // Read existing history
    let existingData = {
      repository: TARGET_REPO,
      lastUpdated: new Date().toISOString(),
      summary: { totalViews: 0, totalUniques: 0 },
      views: []
    };

    if (fs.existsSync(DATA_FILE)) {
      try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (e) {
        console.error('[View History] Failed to parse existing data file, starting fresh.', e.message);
      }
    }

    // Merge existing views with fetched views
    const viewMap = new Map();
    (existingData.views || []).forEach(v => {
      const dateKey = v.timestamp.substring(0, 10);
      viewMap.set(dateKey, v);
    });

    fetchedViews.forEach(v => {
      const dateKey = v.timestamp.substring(0, 10);
      viewMap.set(dateKey, {
        timestamp: `${dateKey}T00:00:00Z`,
        count: v.count,
        uniques: v.uniques
      });
    });

    // Sort by date ascending
    const mergedViews = Array.from(viewMap.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const totalViews = mergedViews.reduce((acc, curr) => acc + (curr.count || 0), 0);
    const totalUniques = mergedViews.reduce((acc, curr) => acc + (curr.uniques || 0), 0);

    const updatedData = {
      repository: TARGET_REPO,
      lastUpdated: new Date().toISOString(),
      summary: {
        totalViews,
        totalUniques
      },
      views: mergedViews
    };

    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`[View History] Successfully updated history. Total entries: ${mergedViews.length}, Total Views: ${totalViews}.`);

  } catch (error) {
    console.error('[View History] Error during fetch:', error.message);
    process.exitCode = 1;
  }
}

fetchTrafficViews();
