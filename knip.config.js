import fs from 'node:fs';
import path from 'node:path';

/** @type {import('knip').KnipConfig} */
export default {
  entry: [...getBlockEntryPoints(), 'scripts/**/*.js', 'tour/main.js', '404.html', 'head.html'],
  project: ['blocks/**/*', 'scripts/**/*', 'styles/**/*', 'libs/**/*', 'icons/**/*', 'tour/**/*'],
  ignore: ['node_modules', 'media/**/*', '.github/**/*', '.husky/**/*', 'blocks/theme-editor/contrast-worker.js', 'libs/clusterize/clusterize.js'],
  reportUnusedExports: true,
  ignoreExportsUsedInFile: true,
  includeEntryExports: true,
  debugDependencies: true,
};

function getBlockEntryPoints() {
  const blocksDir = path.join(process.cwd(), 'blocks');
  const entries = [];

  if (!fs.existsSync(blocksDir)) return entries;

  for (const dirent of fs.readdirSync(blocksDir, { withFileTypes: true })) {
    if (dirent.isDirectory()) {
      const blockName = dirent.name;
      const jsFile = path.join(blocksDir, blockName, `${blockName}.js`);
      if (fs.existsSync(jsFile)) {
        entries.push(`blocks/${blockName}/${blockName}.js`);
      }
    }
  }

  return entries;
}
