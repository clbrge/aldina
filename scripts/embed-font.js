import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const [theme, pkg, family, cutsArg] = process.argv.slice(2)
if (!theme || !pkg || !family) {
  console.error('usage: node scripts/embed-font.js <theme> <@fontsource/pkg> <FamilyName> [cuts=400,600,700,400i,600i]')
  console.error('  cut "400" = weight 400 normal; "400i" = weight 400 italic. Subset: latin.')
  process.exit(2)
}

const cuts = (cutsArg || '400,600,700,400i,600i').split(',').map(s => s.trim()).filter(Boolean)
const base = pkg.replace('@fontsource/', '')
const srcDir = join('node_modules', pkg, 'files')
const themeDir = join('themes', theme)
const fontsDir = join(themeDir, 'fonts')
const tokensPath = join(themeDir, 'tokens.css')

if (!existsSync(tokensPath)) {
  console.error(`no ${tokensPath} — scaffold the theme (tokens.css with a :root block) first`)
  process.exit(1)
}
mkdirSync(fontsDir, { recursive: true })

const faces = cuts.map(cut => {
  const italic = cut.endsWith('i')
  const weight = italic ? cut.slice(0, -1) : cut
  const style = italic ? 'italic' : 'normal'
  const file = `${base}-latin-${weight}-${style}.woff2`
  const src = join(srcDir, file)
  if (!existsSync(src)) {
    console.error(`missing ${src}\n  run: npm install --no-save ${pkg}`)
    process.exit(1)
  }
  copyFileSync(src, join(fontsDir, file))
  const b64 = readFileSync(src).toString('base64')
  return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2")}`
}).join('\n') + '\n'

let css = readFileSync(tokensPath, 'utf8')
const famEsc = family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
css = css.replace(new RegExp(`@font-face\\s*\\{[^}]*font-family\\s*:\\s*"${famEsc}"[^}]*\\}\\n?`, 'g'), '')
const at = css.indexOf(':root')
if (at < 0) { console.error(`no :root block in ${tokensPath}`); process.exit(1) }
writeFileSync(tokensPath, css.slice(0, at) + faces + css.slice(at))

const kb = Math.round(readFileSync(tokensPath).length / 1024)
console.log(`embedded ${cuts.length} cuts of ${family} → ${tokensPath} (${kb}KB); woff2 copied to ${fontsDir}`)
