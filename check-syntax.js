const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!match) { console.error('No <script> block found'); process.exit(1); }
let biggest = '';
for (const block of match) {
  const body = block.replace(/^<script>/, '').replace(/<\/script>$/, '');
  if (body.length > biggest.length) biggest = body;
}
try {
  new Function(biggest);
  console.log(`OK — main script block parses (${biggest.length} chars)`);
} catch (e) {
  console.error(`SYNTAX ERROR: ${e.message}`);
  process.exit(1);
}
