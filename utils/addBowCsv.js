const fs = require('fs');
const path = require('path');
const processBowCsv = require('./readBowCsv');
const { spawn } = require('child_process');

async function addBowData(bowType, csvFile) {
  const jsonData = processBowCsv(csvFile);

  // Check if the bow type directory exists, if not create it
  const bowDir = path.join(__dirname, 'data', 'bows', bowType);
  if (!fs.existsSync(bowDir)) {
    fs.mkdirSync(bowDir, { recursive: true });
  }

  const dataFile = path.join(bowDir, 'data.json');

  let data = { samples: [] };
  if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile));
  }

  data.samples.push(jsonData);

  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

  // Run the add-calcs script
  const python = spawn('python', [
    'path/to/your/python/calculations/updateData.py',
  ]);
  python.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  python.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  python.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

// Usage: node addBowData.js "Alibow New" "someRandomBow.csv"
const [bowType, csvFile] = process.argv.slice(2);
addBowData(bowType, csvFile);
