const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const source = path.join(__dirname, '..', 'node_modules', 'cesium', 'Build', 'Cesium');
const destination = path.join(__dirname, '..', 'public', 'cesium');

console.log(`Copying Cesium assets from ${source} to ${destination}...`);
if (fs.existsSync(source)) {
  copyDir(source, destination);
  console.log('Cesium assets copied successfully!');
} else {
  console.error(`Error: Source folder ${source} does not exist. Make sure cesium is installed.`);
  process.exit(1);
}
