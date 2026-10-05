const wkx = require('wkx');
const fs = require('fs');

const txt = fs.readFileSync('C:\\Users\\murasakino\\.gemini\\antigravity-ide\\brain\\46a28a18-4816-4774-883d-1f02988a7bee\\.system_generated\\steps\\126\\output.txt', 'utf8');
const start = txt.indexOf('<untrusted-data-b6681e30-4cba-4f2f-b163-f364b88f2b2c>') + '<untrusted-data-b6681e30-4cba-4f2f-b163-f364b88f2b2c>'.length;
const end = txt.indexOf('</untrusted-data-b6681e30-4cba-4f2f-b163-f364b88f2b2c>');

const jsonStr = txt.substring(start, end).trim();
const data = JSON.parse(jsonStr);

let count = 0;
data.forEach(row => {
  const b = Buffer.from(row.location, 'hex');
  const p = wkx.Geometry.parse(b);
  if (p.y >= 14.52 && p.y <= 14.62 && p.x >= 121.02 && p.x <= 121.12) {
    console.log(row.id, p.y, p.x);
    count++;
  }
});
console.log('Total inside PASIG_BOUNDS:', count);
