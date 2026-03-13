import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/images');
const URL = 'http://localhost:5176/';

function frameCentered(azimuthDeg, polarDeg, padding = 1.6) {
  return (page) =>
    page.evaluate(({ az, po, pad }) => {
      const d = window.__demo;
      if (!d) return null;

      // R3F nests objects deeper — find a Group containing multiple meshes
      let bookGroup = null;
      d.scene.traverse((obj) => {
        if (bookGroup) return;
        if (obj.type === 'Group') {
          let meshCount = 0;
          obj.traverse((c) => { if (c.isMesh) meshCount++; });
          if (meshCount >= 4) bookGroup = obj;
        }
      });
      if (!bookGroup) return null;

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      bookGroup.traverse((child) => {
        if (!child.isMesh || !child.geometry) return;
        child.geometry.computeBoundingBox();
        const bb = child.geometry.boundingBox;
        if (!bb) return;
        const corners = [
          { x: bb.min.x, y: bb.min.y, z: bb.min.z },
          { x: bb.max.x, y: bb.min.y, z: bb.min.z },
          { x: bb.min.x, y: bb.max.y, z: bb.min.z },
          { x: bb.max.x, y: bb.max.y, z: bb.min.z },
          { x: bb.min.x, y: bb.min.y, z: bb.max.z },
          { x: bb.max.x, y: bb.min.y, z: bb.max.z },
          { x: bb.min.x, y: bb.max.y, z: bb.max.z },
          { x: bb.max.x, y: bb.max.y, z: bb.max.z },
        ];
        for (const c of corners) {
          const v = child.localToWorld(d.camera.position.clone().set(c.x, c.y, c.z));
          minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); minZ = Math.min(minZ, v.z);
          maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); maxZ = Math.max(maxZ, v.z);
        }
      });

      if (!isFinite(minX)) return null;

      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
      const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
      const fov = (d.camera.fov * Math.PI) / 180;
      const dist = (maxDim * pad) / (2 * Math.tan(fov / 2));

      const theta = (az * Math.PI) / 180;
      const phi = (po * Math.PI) / 180;
      d.camera.position.set(
        cx + dist * Math.sin(phi) * Math.sin(theta),
        cy + dist * Math.cos(phi),
        cz + dist * Math.sin(phi) * Math.cos(theta),
      );
      d.controls.target.set(cx, cy, cz);
      d.controls.update();

      return { cx, cy, cz, dist, maxDim };
    }, { az: azimuthDeg, po: polarDeg, pad: padding });
}

function setOpenProgress(value) {
  return (page) =>
    page.evaluate((v) => {
      const d = window.__demo;
      if (d?.bookRef?.current) {
        d.bookRef.current.setOpenProgress(v);
      }
    }, value);
}

async function hideUI(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]')
      .forEach((el) => {
        // Don't hide the canvas container (R3F Canvas wrapper)
        if (el.querySelector('canvas')) return;
        el.style.display = 'none';
      });
  });
}

function waitFrames(page, n) {
  return page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let i = 0;
        (function tick() {
          if (++i >= count) return resolve();
          requestAnimationFrame(tick);
        })();
      }),
    n,
  );
}

async function simulatePageCurl(page, startX, startY, endX, endY, steps = 20) {
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  const sx = box.x + box.width * startX;
  const sy = box.y + box.height * startY;
  const ex = box.x + box.width * endX;
  const ey = box.y + box.height * endY;

  await page.mouse.move(sx, sy);
  await page.mouse.down({ button: 'left' });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(sx + (ex - sx) * t, sy + (ey - sy) * t);
    await waitFrames(page, 2);
  }
}

const shots = [
  {
    name: 'default',
    description: 'Closed book with sprites (R3F)',
    setup: async (page) => {
      await waitFrames(page, 30);
      const info = await frameCentered(25, 60, 1.8)(page);
      console.log('  bbox:', JSON.stringify(info));
      await waitFrames(page, 10);
    },
  },
  {
    name: 'open-half',
    description: 'Open book showing sprite pages (R3F)',
    setup: async (page) => {
      await setOpenProgress(0.5)(page);
      await waitFrames(page, 40);
      const info = await frameCentered(10, 55, 1.6)(page);
      console.log('  bbox:', JSON.stringify(info));
      await waitFrames(page, 10);
    },
  },
  {
    name: 'demo-ui',
    description: 'Full UI with theatre controls (R3F)',
    setup: async (page) => {
      await setOpenProgress(0.35)(page);
      await waitFrames(page, 40);
      await frameCentered(5, 55, 1.7)(page);
      await waitFrames(page, 10);
    },
    showUI: true,
  },
];

async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl'],
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const shot of shots) {
    console.log(`Taking: ${shot.name}`);
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await waitFrames(page, 60);

    await shot.setup(page);

    if (!shot.showUI && !shot.skipHideUI) {
      await hideUI(page);
      await waitFrames(page, 5);
    }

    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    await page.mouse.up({ button: 'left' }).catch(() => {});
    await page.close();
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
