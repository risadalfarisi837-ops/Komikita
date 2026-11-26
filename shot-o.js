const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.goto('file:///tmp/k5/test/o.html');
  await p.waitForFunction('window.done===true', null, { timeout: 8000 });
  await (await p.$('canvas')).screenshot({ path: 'outfit.png' });
  await b.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
