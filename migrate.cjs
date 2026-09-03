const fs = require('fs');
const path = require('path');

const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
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
};

// Copy components
copyDir('e:/ZALO_PROJECT_2/client/src/layouts', 'e:/ZALO_PROJECT_2/desktop-app/src/layouts');
copyDir('e:/ZALO_PROJECT_2/client/src/styles', 'e:/ZALO_PROJECT_2/desktop-app/src/styles');

// Create a components directory and copy pages as components
fs.mkdirSync('e:/ZALO_PROJECT_2/desktop-app/src/components', { recursive: true });
fs.copyFileSync('e:/ZALO_PROJECT_2/client/src/pages/index.jsx', 'e:/ZALO_PROJECT_2/desktop-app/src/components/Messaging.jsx');
fs.copyFileSync('e:/ZALO_PROJECT_2/client/src/pages/accounts.jsx', 'e:/ZALO_PROJECT_2/desktop-app/src/components/Accounts.jsx');

console.log("Migration complete.");
