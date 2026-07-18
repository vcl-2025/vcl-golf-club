#!/usr/bin/env bash
# 本地构建 log-lottery，输出到 public/log-lottery（不依赖 GitHub Pages）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/vendor/log-lottery"
OUT="$ROOT/public/log-lottery"
REPO_URL="${LOG_LOTTERY_REPO:-https://github.com/LOG1997/log-lottery.git}"

if [[ ! -f "$VENDOR/package.json" ]]; then
  echo ">> cloning log-lottery into vendor/"
  mkdir -p "$ROOT/vendor"
  rm -rf "$VENDOR"
  git clone --depth 1 "$REPO_URL" "$VENDOR"
fi

cd "$VENDOR"

# 本地化默认音乐（上游默认指向已失效的 to2026.xyz）
echo ">> applying local audio defaults"
mkdir -p public/resource/audio
cp -f src/assets/audio/worldcup.mp3 public/resource/audio/worldcup.mp3
cp -f src/assets/audio/end.mp3 public/resource/audio/end.mp3
cp -f src/assets/audio/enter.wav public/resource/audio/enter.wav

python3 <<'PY'
from pathlib import Path

# 1) 本地化默认音乐
path = Path("src/store/data.ts")
text = path.read_text(encoding="utf-8")
marker = "export const defaultMusicList"
start = text.find(marker)
if start < 0:
    raise SystemExit("defaultMusicList not found")
if "const audioBase" not in text:
    text = text.replace(
        "const originUrl = 'https://to2026.xyz'",
        "const originUrl = 'https://to2026.xyz'\n"
        "const audioBase = `${import.meta.env.BASE_URL}resource/audio`",
        1,
    )
    start = text.find(marker)
end = text.find("export const defaultPrizeList", start)
if end < 0:
    raise SystemExit("defaultPrizeList not found")
replacement = """export const defaultMusicList = [
    {
        id: `worldcup.mp3`,
        name: 'World Cup（默认背景乐）',
        url: `${audioBase}/worldcup.mp3`,
    },
    {
        id: `enter.wav`,
        name: 'Enter（进场）',
        url: `${audioBase}/enter.wav`,
    },
    {
        id: `end.mp3`,
        name: 'End（揭晓）',
        url: `${audioBase}/end.mp3`,
    },
]

"""
path.write_text(text[:start] + replacement + text[end:], encoding="utf-8")
print("patched defaultMusicList")

# 2) 中奖卡默认高对比橙
cfg = Path("src/store/globalConfig.ts")
cfg.write_text(
    cfg.read_text(encoding="utf-8").replace("luckyCardColor: '#ECB1AC'", "luckyCardColor: '#F15B98'").replace("luckyCardColor: '#7A2436'", "luckyCardColor: '#F15B98'").replace("luckyCardColor: '#E86A23'", "luckyCardColor: '#F15B98'"),
    encoding="utf-8",
)
print("patched luckyCardColor")
PY

echo ">> installing deps"
npm install --legacy-peer-deps

echo ">> building (base=/log-lottery/)"
npm run build

echo ">> syncing to public/log-lottery"
rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a --exclude='*.gz' "$VENDOR/dist/" "$OUT/"
# 页面标题兜底（源码 index.html 已是 VCL；兼容旧构建产物）
if [[ -f "$OUT/index.html" ]]; then
  sed -i.bak \
    -e 's/<title>Log-Lottery<\/title>/<title>VCL Golf Club · 抽奖管理<\/title>/' \
    -e 's/<title>VCL 抽奖<\/title>/<title>VCL Golf Club · 抽奖管理<\/title>/' \
    "$OUT/index.html" || true
  rm -f "$OUT/index.html.bak"
fi


# SPA history 回退：为客户端路由生成真实 index.html，避免 CF Pages
# 主站 /* -> /index.html 吞掉 /log-lottery/home 等路径
echo ">> writing SPA route fallbacks"
ROUTES=(
  home demo mobile
  config
  config/person config/person/all config/person/already
  config/prize
  config/global config/global/face config/global/image config/global/music
  config/server config/readme
)
for r in "${ROUTES[@]}"; do
  mkdir -p "$OUT/$r"
  cp -f "$OUT/index.html" "$OUT/$r/index.html"
done

echo ">> done. open /log-lottery/home"
echo ">> 若仍无声音：到抽奖页「全局配置」重置音乐/数据，或清站点 localStorage 后刷新"
du -sh "$OUT"
