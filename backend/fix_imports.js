const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.push('./server.js');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  // fix export { \n ... \n }
  if (/^export\s+{[\s\S]*?}[;]?/m.test(content)) {
    content = content.replace(/^export\s+{([\s\S]*?)}[;]?/gm, 'module.exports = {$1};');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed multiline exports in', f);
  }
});
