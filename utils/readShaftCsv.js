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
records.shift()



const output = records.map(row => {
  const outputRow = {
    "Name": row[keys[0]], 
    "GPI": row[keys[1]], 
    "OD": row[keys[2]], 
    "ID": row[keys[3]], 
    "Stock Length": row[keys[4]], 
    "Insert Stem Length": row[keys[5]], 
    "Insert Rim Length": row[keys[6]], 
    "Bushing/Nock Inner Length": row[keys[7]], 
    "Bushing Outer Length": row[keys[8]], 
    "Insert weight": row[keys[9]], 
    "Bushing/Nock weight": row[keys[10]]
  }
  Object.keys(outputRow).forEach(key => {
    if (outputRow[key] === ''){
      outputRow[key] = 'unknown'
    }
    if (!isNaN(outputRow[key])) {
      outputRow[key] = Number(outputRow[key])
    }
  })  
  return outputRow
})



console.dir(output, { maxArrayLength: null });
