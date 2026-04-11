#!/usr/bin/env node
/**
 * One-time migration: update placeholder spec files from old helpers
 * (waitForRegistry / getExerciseConfig) to new DOM-based helpers
 * (waitForApp / exerciseExistsInSelect / exerciseIsTimed).
 *
 * Run once then delete this file.
 */
const fs = require('fs');
const path = require('path');

const exercises = [
  { id: 'pushup',          isTimed: false },
  { id: 'lunge',           isTimed: false },
  { id: 'pistol',          isTimed: false },
  { id: 'pullup',          isTimed: false },
  { id: 'pike',            isTimed: false },
  { id: 'dip',             isTimed: false },
  { id: 'row',             isTimed: false },
  { id: 'glutebridge',     isTimed: false },
  { id: 'legraise',        isTimed: false },
  { id: 'bandpullapart',   isTimed: false },
  { id: 'plank',           isTimed: true  },
  { id: 'lsit',            isTimed: true  },
  { id: 'archhang',        isTimed: true  },
  { id: 'scapularpull',    isTimed: true  },
  { id: 'shoulderdislocate', isTimed: true },
  { id: 'hipflexor',       isTimed: true  },
  { id: 'wristwarmup',     isTimed: true  },
  { id: 'foamroller',      isTimed: true  },
  { id: 'birddog',         isTimed: true  },
];

const dir = path.join(__dirname, '..', 'exercises');

for (const ex of exercises) {
  const filePath = path.join(dir, ex.id + '.spec.ts');
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', ex.id + '.spec.ts');
    continue;
  }

  let src = fs.readFileSync(filePath, 'utf8');

  // Replace import line
  src = src.replace(
    "import { loadPage, waitForRegistry, getExerciseConfig } from './_helpers';",
    "import { loadPage, waitForApp, exerciseExistsInSelect, exerciseIsTimed } from './_helpers';"
  );

  // Replace test body
  const oldBody = `test('${ex.id}: registry config is correct', async ({ page }) => {
  await loadPage(page);
  await waitForRegistry(page);
  const config = await getExerciseConfig(page, '${ex.id}');
  expect(config).not.toBeNull();
  expect(config!.id).toBe('${ex.id}');
  expect(config!.isTimed).toBe(${ex.isTimed});
  expect(config!.isFloor).toBe(${!ex.isTimed ? 'false' : 'true'});
  // TODO: full pose-detection assertions need`;

  // Use regex to match old body (isFloor value varies, and there's a y4m filename after the TODO comment)
  const oldPattern = new RegExp(
    `test\\('${ex.id}: registry config is correct', async \\(\\{ page \\}\\) => \\{\\n` +
    `  await loadPage\\(page\\);\\n` +
    `  await waitForRegistry\\(page\\);\\n` +
    `  const config = await getExerciseConfig\\(page, '${ex.id}'\\);\\n` +
    `  expect\\(config\\)\\.not\\.toBeNull\\(\\);\\n` +
    `  expect\\(config!\\.id\\)\\.toBe\\('${ex.id}'\\);\\n` +
    `  expect\\(config!\\.isTimed\\)\\.toBe\\(${ex.isTimed}\\);\\n` +
    `  expect\\(config!\\.isFloor\\)\\.toBe\\(.*?\\);\\n` +
    `  // TODO: full pose-detection assertions need ([^\\n]+)\\n` +
    `\\}\\);`,
    's'
  );

  src = src.replace(oldPattern, (_, todoRest) => {
    return `test('${ex.id}: is registered in the exercise list', async ({ page }) => {
  await loadPage(page);
  await waitForApp(page);
  const exists = await exerciseExistsInSelect(page, '${ex.id}');
  expect(exists).toBe(true);
  const isTimed = await exerciseIsTimed(page, '${ex.id}');
  expect(isTimed).toBe(${ex.isTimed});
  // TODO: full pose-detection assertions need ${todoRest}
});`;
  });

  fs.writeFileSync(filePath, src);
  console.log('Updated:', ex.id + '.spec.ts');
}
console.log('Done.');
