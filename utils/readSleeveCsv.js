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

output = records.map(record => {
  if (record['Shaft Size'] !== '') {
    record['Shaft Size'] = Number(record['Shaft Size'])
  } else {
    record['Shaft Size'] = 'unknown'
  }
  if (record['Outsert ID'] !== '') {
    record['Outsert ID'] = Number(record['Outsert ID'])
  } else {
    record['Outsert ID'] = 'unknown'
  } 
  if (record['Outsert OD'] !== '') {
    record['Outsert OD'] = Number(record['Outsert OD'])
  } else {
    record['Outsert OD'] = 'unknown'
  }
  if (record['Point size'] === '') {
    record['Point size'] = 'unknown'
  }
  return record
})

console.dir(records, {maxArrayLength: null})
/*
const output = records.map(row => {
    
    }})



console.dir(output, { maxArrayLength: null });
*/