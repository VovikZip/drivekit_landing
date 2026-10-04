const assert = require('assert');
const fs = require('fs');
const path = require('path');

for (const filename of ['index.html', 'admin-login.html', 'admin.html']) {
  const html = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `${filename} contains duplicate ids`);

  for (const match of html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)) {
    const localPath = path.join(__dirname, '..', match[1]);
    assert.ok(fs.existsSync(localPath), `${filename} references missing ${match[1]}`);
  }

  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.includes(match[1]), `${filename} references missing #${match[1]}`);
  }
}

console.log('Static HTML checks passed');
