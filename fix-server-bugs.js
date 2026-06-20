const fs = require('fs');
const path = require('path');
 
const SERVER_PATH = path.join(__dirname, 'src', 'server.js');
 
if (!fs.existsSync(SERVER_PATH)) {
  console.error('❌  src/server.js not found. Run from the project root.');
  process.exit(1);
}
 
let code = fs.readFileSync(SERVER_PATH, 'utf8');
let fixCount = 0;
 
function applyFix(label, search, replacement) {
  if (!code.includes(search)) {
    console.warn(`⚠️   Fix skipped (anchor not found): ${label}`);
    return;
  }
  code = code.replace(search, replacement);
  fixCount++;
  console.log(`✅  Applied: ${label}`);
}