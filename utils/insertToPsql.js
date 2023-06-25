require('dotenv').config();
const pgp = require('pg-promise')();
const fs = require('fs');
const path = require('path');

DATABASE_URI = 'postgresql://postgres:bdK1ct2x4UCwxS2@localhost:5432/';

const dataPath = path.join(__dirname, '../', 'data', 'bows');

async function main() {
  const db = pgp(DATABASE_URI);

  console.log(`Looking for subfolders in ${dataPath}`);
  const bowFolders = fs.readdirSync(dataPath);

  for (const folder of bowFolders) {
    console.log(`Found subfolder ${folder}`);
    const filePath = path.join(dataPath, folder, 'data.json');
    console.log(`Reading ${filePath}`);
    const rawData = fs.readFileSync(filePath);
    const jsonData = JSON.parse(rawData);

    const bowTitle = jsonData['bow-title'];
    const bowLink = jsonData['bow-link'];
    const samples = jsonData['samples'];

    const bowTypeData = buildBowTypeQuery(bowTitle, bowLink);
    const bowTypeId = await insertBowTypeAndGetId(db, bowTypeData);
    console.log(`Successfully inserted, we now have bow ID ${bowTypeId}`);
    for (const sample of samples) {
      const sampleQuery = buildSampleQuery(sample, bowTypeId);
      //console.log(`Inserting bow of id ${bowTypeId}`);
      const sampleId = await insertSampleAndGetSampleId(db, sampleQuery);
      if (sampleId) {
        //console.log(
        //          `Succsesfully inserted sample and got sampleID ${sampleId}`,
        //);
      }
      if (sample['fps-data']) {
        const fpsQueries = buildFpsQueries(sample['fps-data']);
        insertFpsData(db, sampleId, fpsQueries);
        const fpsRegressionQueries = buildFpsRegressionQuery(
          sample['regression-estimation']['fps-data'],
        );
        insertFpsRegressionData(db, fpsRegressionQueries, sampleId);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e.stack);
    process.exit(1);
  })
  .finally(() => {
    pgp.end();
  });

function buildBowTypeQuery(bowTitle, bowLink) {
  console.log(
    `Building BowType Insertion Query for bow with title ${bowTitle}`,
  );
  const manufacturers = [
    'AF Archery',
    'Alibow',
    'Arcus',
    'Bearpaw',
    'Dae Han',
    'Daylite',
    'MR',
    'Elong',
    'Flagella',
    'Grozer',
    'Flagella Dei',
    'Grozer',
    'Higo Souzan',
    'Jackal',
    'Javaman',
    'Koyama',
    'JZW',
    'Kassai',
    'Kaya',
    'Liang Zhi',
    'Magor',
    'Mariner',
    'Medicine Bows',
    'Misko Rovcanin',
    'Nawalny',
    'Numair',
    'Paragon',
    'Samick',
    'Sarmat',
    'Spearman',
    'Simsek',
    'Vegh',
    'Yuwen',
  ];
  let manufacturer;
  let modelName;
  for (let i = 0; i < manufacturers.length; i++) {
    if (bowTitle.startsWith(manufacturers[i])) {
      manufacturer = manufacturers[i];
    }
  }
  if (manufacturer === undefined) {
    manufacturer = 'Other';
    console.log(`Bow title: ${bowTitle}`);
    modelName = bowTitle.trim();
  } else {
    modelName = bowTitle.replace(manufacturer, '').trim();
  }

  return {
    manufacturer,
    model_name: modelName,
    bow_link: bowLink,
  };
}

function buildSampleQuery(sample, bowTypeId) {
  const sampleQuery = {};
  sampleQuery['bow_type_id'] = bowTypeId;
  sampleQuery['unstrung_length'] = sample['unstrung-length'];
  sampleQuery['strung_length'] = sample['strung-length'];
  sampleQuery['min_box_length'] = sample['min-box-dim']['length'];
  sampleQuery['min_box_width'] = sample['min-box-dim']['width'];
  sampleQuery['min_box_depth'] = sample['min-box-dim']['depth'];
  sampleQuery['siyah_effective_top_length'] =
    sample['siyahs']['effective-top-length'];
  sampleQuery['siyah_effective_bottom_length'] =
    sample['siyahs']['effective-bottom-length'];
  sampleQuery['siyah_effective_top_angle'] =
    sample['siyahs']['effective-top-angle'];
  sampleQuery['siyah_effective_top_angle'] =
    sample['siyahs']['effective-top-angle'];
  sampleQuery['bow_mass'] = sample['bow-mass'];
  sampleQuery['grip_length'] = sample['grip-dim']['length'];
  sampleQuery['grip_width'] = sample['grip-dim']['width'];
  sampleQuery['grip_depth'] = sample['grip-dim']['thickness'];
  sampleQuery['max_limb_thickness'] = sample['max-limb-thickness'];
  sampleQuery['min_limb_thickness'] = sample['min-limb-thickness'];
  sampleQuery['max_limb_width'] = sample['max-limb-width'];
  sampleQuery['min_limb_width'] = sample['min-limb-width'];
  sampleQuery['arrow_pass_width'] = sample['arrow-pass-width'];
  sampleQuery['max_draw'] = sample['max-draw'];
  sampleQuery['stock_string_length_min'] = sample['stock-string-length']['min'];
  sampleQuery['stock_string_length_max'] = sample['stock-string-length']['max'];
  sampleQuery['brace_height'] = sample['brace-height'];
  if (sample['contributed-by']) {
    const contributors = getContributor(sample['contributed-by']);
    sampleQuery['contributor_contact_type'] = contributors[0][0];
    sampleQuery['contributor_contact_info'] = contributors[0][1];
  }
  sampleQuery['manufacture_date'] = sample['manufacture-date'];
  sampleQuery['measurement_date'] = sample['measurement-date'];
  sampleQuery['comments'] = sample['comments'];
  sampleQuery['asym'] = sample['asym'];
  sampleQuery['asym_length_top'] = sample['asym-length']['top'];
  sampleQuery['asym_length_bottom'] = sample['asym-length']['bottom'];
  sampleQuery['df_data'] = pointArrayToPath(sample['df-data']);
  sampleQuery['central_differences'] = pointArrayToPath(
    sample['central-differences'],
  );
  sampleQuery['longbow_point'] = sample['longbow-point'];

  if (sample['stored-energy']) {
    sampleQuery['stored_energy'] =
      convertStoredEnergyToArray(sample['stored-energy']) || [];
  }

  if (sample['regression-estimation'] !== undefined) {
    sampleQuery['regression_curve'] = pointArrayToPath(
      sample['regression-estimation']['df-curve'],
    );
    sampleQuery['coeffs'] = sample['regression-estimation']['coeffs'];
    sampleQuery['regression_eqn'] =
      sample['regression-estimation']['regression-eqn'];
    sampleQuery['regression_derivative'] =
      sample['regression-estimation']['regression-derivative'];
    sampleQuery['regression_derivative_values'] = pointArrayToPath(
      sample['regression-estimation']['regression-derivative-values'],
    );
    sampleQuery['hysteresis'] = sample['hysteresis'] || -1;
    sampleQuery['virtual_mass'] = sample['virtual-mass'] || -1;
  }
  return sampleQuery;
}

async function insertBowTypeAndGetId(db, bowTypeData) {
  try {
    // Check if the combination of model_name and manufacturer already exists
    const existingBowType = await db.oneOrNone(
      'SELECT bow_type_id FROM bow_types WHERE model_name = $1 AND manufacturer = $2',
      [bowTypeData.model_name, bowTypeData.manufacturer],
    );

    if (existingBowType) {
      // If it exists, return the existing id
      return existingBowType.bow_type_id;
    } else {
      // If it doesn't exist, insert the new row
      const query =
        pgp.helpers.insert(bowTypeData, null, 'bow_types') +
        ' RETURNING bow_type_id';
      const result = await db.one(query);

      // Return the id of the new row
      return result.bow_type_id;
    }
  } catch (error) {
    console.error('Error inserting bow type:', error);
    throw error;
  }
}
async function insertSampleAndGetSampleId(db, sampleQuery) {
  const existingSample = await db.oneOrNone(
    'SELECT sample_id FROM samples WHERE df_data_text = $1',
    [sampleQuery['df_data']],
  );

  if (existingSample) {
    console.log(
      `Existing sample with sample ID ${existingSample.sample_id} found`,
    );
    return existingSample.sample_id;
  }

  const insertQuery =
    pgp.helpers.insert(sampleQuery, null, 'samples') + ' RETURNING sample_id';
  try {
    const result = await db.one(insertQuery);
    return result.sample_id;
  } catch (error) {
    console.error('Error executing query', error);
  }
}

async function insertFpsData(db, sampleId, fpsQueries) {
  // Start a transaction
  await db.tx(async (t) => {
    // Loop through each query in the array
    for (let query of fpsQueries) {
      // Insert the data into the fps_data table and return the inserted row
      const insertedRow = await t.one(
        `INSERT INTO fps_data (
                    sample_id, dl, arrow_weight, gpp, fps, measured_energy, stored_energy, efficiency, draw_length_to_belly
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9
                ) RETURNING *`,
        [
          sampleId,
          query['dl'],
          query['arrow_weight'],
          query['gpp'],
          query['fps'],
          query['measured_energy'],
          query['stored_energy'],
          query['efficiency'],
          query['dl_to_belly'],
        ],
      );

      // Check if the insert was successful
      if (!insertedRow) {
        throw new Error('Insert failed');
      } else {
        console.log(`Inserted row with fps_id: ${insertedRow.fps_id}`);
      }
    }
  });
}

async function insertFpsRegressionData(db, fpsRegressionQuery, sampleId) {
  try {
    for (const data of fpsRegressionQuery) {
      await db.none(
        'INSERT INTO fps_regression_data(sample_id, dl, coefficients, fitted_line) VALUES($1, $2, $3, $4)',
        [sampleId, data.dl, data.coefficients, data.fitted_line],
      );
    }

    console.log('Data inserted successfully');
  } catch (error) {
    console.error('Error inserting data:', error);
  }
}

function getContributor(contributedBy) {
  return Object.entries(contributedBy);
}

function pointArrayToPath(dfData) {
  return `((${dfData.map((point) => `${point.x},${point.y}`).join('),(')}))`;
}

function convertStoredEnergyToArray(storedEnergy) {
  Object.entries(storedEnergy).map(([key, value]) => [parseFloat(key), value]);
}

function buildFpsQueries(fpsData) {
  return fpsData.map((point) => {
    return {
      dl: point['dl'],
      arrow_weight: point['arrow-weight'],
      gpp: point['gpp'],
      fps: point['fps'],
      measured_energy: point['measured-energy'],
      stored_energy: point['stored-energy'],
      defficiency: point['efficiency'],
      draw_length_to_belly: point['dl-to-belly'],
    };
  });
}

function buildFpsRegressionQuery(fpsRegressionData) {
  const fpsRegressionQuery = [];
  for (const entry in fpsRegressionData) {
    const fpsRegressionEntry = {};
    fpsRegressionEntry['dl'] = entry;
    fpsRegressionEntry['coefficients'] = fpsRegressionData[entry]['coeffs'];
    fpsRegressionEntry['fitted_line'] = pointArrayToPath(
      fpsRegressionData[entry]['fitted-line'],
    );
    fpsRegressionQuery.push(fpsRegressionEntry);
  }
  return fpsRegressionQuery;
}
