require('dotenv').config();
const pgp = require('pg-promise')();
const fs = require('fs');
const path = require('path');

dbConfig = {
  host: 'localhost',
  port: 5433,
  database: 'test_db',
  user: 'postgres',
};

const dataPath = path.join(__dirname, '../', 'data', 'bows');

async function main() {
  const db = pgp(dbConfig);

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

    for (const sample of samples) {
      buildSampleQuery(sample);
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
  sampleQuery['min_box_dim_length'] = sample['min-box-dim']['length'];
  sampleQuery['min_box_dim_width'] = sample['min-box-dim']['width'];
  sampleQuery['min_box_dim_depth'] = sample['min-box-dim']['depth'];
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
  sampleQuery['grip_depth'] = sample['grip-dim']['depth'];
  sampleQuery['max_limb_thickness'] = sample['max-limb-thickness'];
  sampleQuery['min_limb_thickness'] = sample['min-limb-thickness'];
  sampleQuery['max_limb_width'] = sample['max-limb-width'];
  sampleQuery['min_limb_width'] = sample['min_limb_width'];
  sampleQuery['arrow_pass_width'] = sample['arrow-pass-width'];
  sampleQuery['max_draw'] = sample['max-draw'];
  sampleQuery['stock_string_length_min'] = sample['stock-string-length-min'];
  sampleQuery['stock_string_length_max'] = sample['stock-string-length-max'];
  sampleQuery['brace_height'] = sample['brace-height'];
  if (sample['contributed-by']) {
    const contributors = getContributor(sample['contributed-by']);
    sampleQuery['contributor_contact_type'] = contributors[0];
    sampleQuery['contributor_contact_info'] = contributors[1];
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
    sampleQuery['stored_energy'] = convertStoredEnergyToArray(
      sample['stored-energy'],
    );
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
    sampleQuery['hysteresis'] = sample['hysteresis'];
    sampleQuery['virtual_mass'] = sample['virtual-mass'];
  }
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

function getContributor(contributedBy) {
  return Object.entries(contributedBy);
}

function pointArrayToPath(dfData) {
  return `((${dfData.map((point) => `${point.x},${point.y}`).join('),(')}))`;
}

function convertStoredEnergyToArray(storedEnergy) {
  Object.entries(storedEnergy).map(([key, value]) => [parseFloat(key), value]);
}

function buildFpsQuery(fpsData) {}
