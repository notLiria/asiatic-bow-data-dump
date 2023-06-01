require('dotenv').config();
const pgp = require('pg-promise')();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const client = pgp({
  connectionString: 'postgres://liria:1234@localhost:5433/test_db',
});

const dataPath = path.join(__dirname, '../', 'data', 'bows');

async function main() {
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

    // Insert BowType or do nothing if it already exists
    const bowTypeRes = await client.oneOrNone(
      'INSERT INTO BowTypes(BowTitle, BowLink) VALUES($1, $2) ON CONFLICT (BowTitle) DO NOTHING RETURNING BowTypeID',
      [bowTitle, bowLink],
    );
    let bowTypeId = bowTypeRes ? bowTypeRes.bowtypeid : null;

    if (!bowTypeId) {
      // If BowType was not inserted, it means it already exists. Fetch its BowTypeID.
      const existingBowType = await client.one(
        'SELECT BowTypeID FROM BowTypes WHERE BowTitle = $1',
        [bowTitle],
      );
      console.log(existingBowType);
      bowTypeId = existingBowType.bowtypeid;
    }

    for (const sample of samples) {
      const dfDataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(sample['df-data']))
        .digest('hex');
      const existingSample = await client.oneOrNone(
        'SELECT * FROM Samples WHERE DfHash = $1',
        [dfDataHash],
      );

      if (!existingSample) {
        if (sample['contributed-by']) {
          sample['contribution-type'] = Object.keys(
            sample['contributed-by'],
          )[0];
          sample['contributed-by'] =
            sample['contributed-by'][sample['contribution-type']];
        } else {
          sample['contribution-type'] = 'N/A';
          sample['contributed-by'] = 'N/A';
        }

        const values = {
          bowTypeId: bowTypeId,
          unstrungLength: sample['unstrung-length'],
          strungLength: sample['strung-length'],
          minBoxDimLength: sample['min-box-dim'].length,
          minBoxWidth: sample['min-box-dim'].width,
          minBoxDepth: sample['min-box-dim'].depth,
          siyahEffectiveTopLength: sample.siyahs['effective-top-length'],
          siyahEffectiveBottomLength: sample.siyahs['effective-bottom-length'],
          siyahEffectiveTopAngle: sample.siyahs['effective-top-angle'],
          siyahEffectiveBottomAngle: sample.siyahs['effective-bottom-angle'],
          bowMass: sample['bow-mass'],
          gripLength: sample['grip-dim'].length,
          gripWidth: sample['grip-dim'].width,
          gripDepth: sample['grip-dim'].thickness,
          maxLimbThickness: sample['max-limb-thickness'],
          minLimbThickness: sample['min-limb-thickness'],
          maxLimbWidth: sample['max-limb-width'],
          minLimbWidth: sample['min-limb-width'],
          arrowPassWidth: sample['arrow-pass-width'],
          maxDraw: sample['max-draw'],
          stockStringLengthMin: sample['stock-string-length'].min,
          stockStringLengthMax: sample['stock-string-length'].max,
          braceHeight: sample['brace-height'],
          contributionType: sample['contribution-type'],
          contributedBy: sample['contributed-by'],
          manufactureDate: sample['manufacture-date'],
          measurementDate: sample['measurement-date'],
          comments: sample.comments,
          asym: sample.asym,
          asymLengthTop: sample['asym-length'].top,
          asymLengthBottom: sample['asym-length'].bottom,
          dfData: JSON.stringify(sample['df-data']),
          centralDifferences: JSON.stringify(sample['central-differences']),
          regressionEstimation: JSON.stringify(sample['regression-estimation']),
          longbowPoint: sample['longbow-point'],
          storedEnergy: convertStoredEnergyToArray(sample['stored-energy']),
          fpsData: sample['fps-data'],
          dfDataHash: dfDataHash,
        };

        const insertSampleQuery = `
  INSERT INTO Samples(
    BowTypeID, 
    UnstrungLength, 
    StrungLength, 
    MinBoxDimLength, 
    MinBoxWidth, 
    MinBoxDepth, 
    SiyahEffectiveTopLength, 
    SiyahEffectiveBottomLength, 
    SiyahEffectiveTopAngle, 
    SiyahEffectiveBottomAngle, 
    BowMass, 
    GripLength, 
    GripWidth, 
    GripDepth, 
    MaxLimbThickness, 
    MinLimbThickness, 
    MaxLimbWidth, 
    MinLimbWidth, 
    ArrowPassWidth, 
    MaxDraw, 
    StockStringLengthMin, 
    StockStringLengthMax, 
    BraceHeight, 
    ContributorContactType, 
    ContributorContactInfo, 
    ManufactureDate, 
    MeasurementDate, 
    Comments, 
    Asym, 
    AsymLengthTop, 
    AsymLengthBottom, 
    DfData, 
    CentralDifferences, 
    RegressionEstimation, 
    LongbowPoint, 
    StoredEnergy,
    DfHash,
    FpsData
  ) VALUES(
    $(bowTypeId), 
    $(unstrungLength), 
    $(strungLength), 
    $(minBoxDimLength), 
    $(minBoxWidth), 
    $(minBoxDepth), 
    $(siyahEffectiveTopLength), 
    $(siyahEffectiveBottomLength), 
    $(siyahEffectiveTopAngle), 
    $(siyahEffectiveBottomAngle), 
    $(bowMass), 
    $(gripLength), 
    $(gripWidth), 
    $(gripDepth), 
    $(maxLimbThickness), 
    $(minLimbThickness), 
    $(maxLimbWidth), 
    $(minLimbWidth), 
    $(arrowPassWidth), 
    $(maxDraw), 
    $(stockStringLengthMin), 
    $(stockStringLengthMax), 
    $(braceHeight), 
    $(contributionType),
    $(contributedBy), 
    $(manufactureDate), 
    $(measurementDate), 
    $(comments), 
    $(asym), 
    $(asymLengthTop), 
    $(asymLengthBottom), 
    $(dfData), 
    $(centralDifferences), 
    $(regressionEstimation), 
    $(longbowPoint), 
    $(storedEnergy),
    $(fpsData),
    $(dfDataHash)
  )`;

        await client.none(insertSampleQuery, values).catch((error) => {
          console.log('ERROR:', error);
        });
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

function convertStoredEnergyToArray(storedEnergy) {
  // Convert dict of 3 values to array of 3 pairs instead
  return Object.entries(storedEnergy);
}
