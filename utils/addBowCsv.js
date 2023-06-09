const fs = require('fs');
const path = require('path');
const processBowCsv = require('./readBowCsv');
const { spawn } = require('child_process');

async function addBowData(bowType, csvFile) {
  const jsonData = processBowCsv(csvFile);

  if (write === undefined) {
    // Check if the bow type directory exists, if not create it
    const bowDir = path.join(__dirname, '..', 'data', 'bows', bowType);
    console.log(`Searching for directory ${bowDir}`);
    if (!fs.existsSync(bowDir)) {
      console.log(`Directory ${bowDir} not found, creating instead.`);
      console.log(`Make sure to update bow title and link manually.`);
      fs.mkdirSync(bowDir, { recursive: true });
    }

    const dataFile = path.join(bowDir, 'data.json');

    let data = { samples: [] };
    if (fs.existsSync(dataFile)) {
      data = JSON.parse(fs.readFileSync(dataFile));
    }

    data.samples.push(jsonData);

    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log(`Data successfully written to ${dataFile}`);

    runNpmScript('add-calcs');
  }
}

function runNpmScript(scriptName) {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const childProcess = spawn(npmCmd, ['run', scriptName], { stdio: 'inherit' });

  childProcess.on('exit', (code) => {
    if (code === 0) {
      console.log(`npm script '${scriptName}' completed successfully.`);
    } else {
      console.error(`npm script '${scriptName}' exited with code ${code}.`);
    }
  });
}

// Usage: node addBowData.js af_qing_lam afQingLam.csv
const [bowType, csvFile, write] = process.argv.slice(2);
addBowData(bowType, csvFile, write);
