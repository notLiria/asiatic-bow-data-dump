const fs = require('fs');
const csvSync = require('csv-parse/sync');

const fileName = process.argv.slice(2)[0];
console.log(fileName);
const input = fs.readFileSync(fileName).toString();

const records = csvSync.parse(input, {
  columns: true,
  skip_empty_lines: true,
});

const keys = Object.keys(records[0]);
console.log(keys);
const output = records
  .map((record) => {
    return {
      dl: parseFloat(record[Object.keys(record)[0]]),
      'arrow-weight': parseFloat(record['Actual Arrow Weight']),
      gpp: parseFloat(record['Actual GPP']),
      fps: parseInt(record['Measured FPS']),
    };
  })
  .filter((record) => !isNaN(record['dl']));

console.dir(output, { maxArrayLength: null });
