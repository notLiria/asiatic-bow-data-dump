const fs = require('fs');
const path = require('path');
const processBowCsv = require('./readBowCsv');
const { spawn } = require('child_process');

async function addBowData(bowType, csvFile) {
  // Process the CSV file
  const jsonData = processBowCsv(csvFile);

  // Check if the bow type directory exists, if not create it
  const bowDir = path.join(__dirname, 'data', 'bows', bowType);
  if (!fs.existsSync(bowDir)) {
    fs.mkdirSync(bowDir, { recursive: true });
  }

  // Path to the data.json file
  const dataFile = path.join(bowDir, 'data.json');

  // Check if the data.json file exists, if not create it with an empty samples array
  let data = { samples: [] };
  if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile));
  }

  // Add the new data to the samples array
  data.samples.push(jsonData);

  // Write the updated data back to the data.json file
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
