const fs = require('fs').promises;
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

// コマンドライン引数を取得
const ROOT_DIR = process.argv[2];

// 引数チェック（未指定の場合は使い方を表示して終了）
if (!ROOT_DIR) {
  const scriptName = path.basename(process.argv[1]);
  console.error(`Usage: node ${scriptName} <target_directory_path>`);
  console.error(`Example: node ${scriptName} /share/podcast`);
  process.exit(1);
}

const parser = new XMLParser();

async function createPodcastIndexHtml() {
  try {
    // 指定されたパスが存在するかチェック
    await fs.access(ROOT_DIR);
    
    const entries = await fs.readdir(ROOT_DIR, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    let htmlOutput = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podcast 配信一覧</title>
  <style>
    :root {
      --bg-color: #121214;
      --card-bg: #1e1e24;
      --text-main: #f3f4f6;
      --text-sub: #9ca3af;
      --accent: #8b5cf6;
      --accent-hover: #a78bfa;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 24px;
      border-left: 5px solid var(--accent);
      padding-left: 12px;
    }
    .podcast-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .podcast-item {
      background-color: var(--card-bg);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .podcast-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(139, 92, 246, 0.15);
    }
    .title-link {
      color: var(--text-main);
      text-decoration: none;
      display: inline-block;
      margin-bottom: 8px;
    }
    .title-link:hover .title {
      color: var(--accent-hover);
    }
    .title {
      font-size: 1.25rem;
      font-weight: bold;
      margin: 0;
      transition: color 0.2s;
    }
    .folder-path {
      font-size: 0.85rem;
      color: var(--text-sub);
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎙️ Podcast 番組一覧</h1>
    <ul class="podcast-list">
`;

    for (const dir of directories) {
      const xmlPath = path.join(ROOT_DIR, dir.name, 'podcast.xml');

      try {
        await fs.access(xmlPath);
        const xmlContent = await fs.readFile(xmlPath, 'utf-8');
        const jsonObj = parser.parse(xmlContent);

        const title = jsonObj?.rss?.channel?.title || jsonObj?.feed?.title || 'タイトルなし';
        const relativeLink = `./${encodeURIComponent(dir.name)}/podcast.xml`;

        htmlOutput += `      <li class="podcast-item">
        <a href="${relativeLink}" class="title-link">
          <p class="title">${escapeHtml(title)}</p>
        </a>
        <div class="folder-path">📁 ${escapeHtml(dir.name)}</div>
      </li>\n`;

      } catch (err) {
        // podcast.xml がないフォルダはスキップ
      }
    }

    htmlOutput += `    </ul>
  </div>
</body>
</html>`;

    // 3. 出力先のパス（例: /share/podcast/index.html）を生成してファイル保存
    const outputPath = path.join(ROOT_DIR, 'index.html');
    await fs.writeFile(outputPath, htmlOutput, 'utf-8');
    
    console.log(`✨ 正常に作成されました: ${outputPath}`);

  } catch (error) {
    console.error(`エラー: パス "${ROOT_DIR}" が見つからないか、アクセスできません。`);
    process.exit(1);
  }
}

function escapeHtml(string) {
  if (typeof string !== 'string') return string;
  return string.replace(/[&<>"']/g, (match) => {
    const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return escapeMap[match];
  });
}

createPodcastIndexHtml();

