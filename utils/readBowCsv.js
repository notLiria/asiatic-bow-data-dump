const fs = require('fs');
const csvSync = require('csv-parse/sync');

function processBowCsv(fileName) {
  //const fileName = process.argv.slice(2)[0];
  console.log(fileName);
  const input = fs.readFileSync(fileName).toString();

  const records = csvSync.parse(input, {
    columns: true,
    skip_empty_lines: true,
  });

  const keys = Object.keys(records[0]);

  const xyData = records
    .map((record) => {
      if (record[keys[1]] !== '') {
        return {
          x: parseFloat(record[keys[0]]),
          y: parseFloat(record[keys[1]]),
        };
      }
    })
    .slice(1)
    .filter((val) => val !== null)
    .filter((val) => val !== undefined);

  const measurementArr = records.map((record) => {
    const varName = record[keys[2]];
    return { [varName]: record[keys[3]] };
  });

  const otherMeasurements = Object.assign.apply(
    Object,
    [{}].concat(measurementArr),
  );

  const output = {};
  output['bow-title'] = keys[1];
  output['unstrung-length'] = parseFloat(
    otherMeasurements['Unstrung Contour Length (cm)'],
  );
  output['strung-length'] = parseFloat(
    otherMeasurements['StrungLength (Tip to tip, cm)'],
  );
  output['min-box-dim'] = {
    length: parseFloat(otherMeasurements['MinBoxDim (Length in cm)']),
    width: parseFloat(otherMeasurements['MinBoxDim (Height in cm)']),
    depth: parseFloat(otherMeasurements['MinBoxDim(Depth in cm)']),
  };
  output['siyahs'] = {
    'effective-top-length': parseFloat(
      otherMeasurements['Effective Siyah Length Top (cm)'],
    ),
    'effective-bottom-length': parseFloat(
      otherMeasurements['Effective Siyah Length Bottom (cm)'],
    ),
    'effective-top-angle': parseFloat(
      otherMeasurements['Effective Siyah Angle Top (degrees)'],
    ),
    'effective-bottom-angle': parseFloat(
      otherMeasurements['Effective Siyah Angle Bottom (degrees)'],
    ),
  };
  output['bow-mass'] = parseFloat(otherMeasurements['Mass (Grams)']);
  output['grip-dim'] = {
    length: parseFloat(otherMeasurements['Grip Dim Length (mm)']),
    width: parseFloat(otherMeasurements['Grip Dim Width (mm)']),
    thickness: parseFloat(otherMeasurements['Grip Dim Thickness (mm)']),
  };
  output['max-limb-thickness'] = parseFloat(
    otherMeasurements['MaxLimbThickness (mm)'],
  );
  output['min-limb-thickness'] = parseFloat(
    otherMeasurements['MinLimbThickness (mm)'],
  );
  output['max-limb-width'] = parseFloat(otherMeasurements['MaxLimbWidth (mm)']);
  output['min-limb-width'] = parseFloat(otherMeasurements['MinLimbWidth (mm)']);
  output['arrow-pass-width'] = parseFloat(
    otherMeasurements['Arrow Pass Width (mm)'],
  );
  output['max-draw'] = parseFloat(
    otherMeasurements['Max Draw Length (Inches)'],
  );
  output['stock-string-length'] = {
    max: parseFloat(otherMeasurements['String Length - Max (cm)']),
    min: parseFloat(otherMeasurements['String Length - Min (cm)']),
  };

  output['brace-height'] = parseFloat(otherMeasurements['Brace Height (cm)']);
  output['manufacture-date'] = otherMeasurements['Manufacture Date (YYYY-MM)'];
  output['measurement-date'] = otherMeasurements['Measurement Date (YYYY-MM)'];
  output['comments'] = otherMeasurements['Comments'];
  output['asym'] = otherMeasurements['Asym (Y/N'] === 'Y' ? true : false;
  output['asym-length'] = {
    top: parseFloat(otherMeasurements['Upper Limb Contour Length (cm)']),
    bottom: parseFloat(otherMeasurements['Lower Limb Contour Length (cm)']),
  };

  output['df-data'] = xyData;

  function removeNaNs(obj) {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'object') {
        obj[key] = removeNaNs(obj[key]);
      }
      if (typeof obj[key] !== 'string') {
        if (Number.isNaN(obj[key])) {
          obj[key] = 'Not Measured';
        }
      }
    });
    return obj;
  }

  removeNaNs(output);

  console.log(output);
  return output;
}

module.exports = processBowCsv;
