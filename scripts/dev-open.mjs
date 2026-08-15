import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

const browser = candidates.find((p) => p && existsSync(p))

const server = spawn('npm run dev', {
  shell: true,
  stdio: 'inherit',
})

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    for (let port = 5173; port <= 5182; port++) {
      try {
        const res = await fetch(`http://localhost:${port}`)
        if (res.ok) return port
      } catch {
        /* not up yet */
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

waitForServer().then((port) => {
  if (port == null) {
    console.error('Could not reach the Vite dev server.')
    server.kill()
    return
  }
  const url = `http://localhost:${port}`
  if (browser) {
    const args = [url]
    if (process.env.MEI_BROWSER_USER_DATA_DIR) {
      args.unshift(`--user-data-dir=${process.env.MEI_BROWSER_USER_DATA_DIR}`)
    }
    const child = spawn(browser, args, { detached: true, stdio: 'ignore' })
    child.unref()
  } else {
    const fallback = spawn('cmd', ['/c', `start "" "${url}"`], { detached: true, stdio: 'ignore' })
    fallback.unref()
  }
  console.log(`\nDev server ready at ${url}`)
  console.log(`Opened in ${browser ? browser.split('/').pop().replace('.exe', '') : 'default browser'}. Press Ctrl+C to stop.`)
})

server.on('exit', () => process.exit())
