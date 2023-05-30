const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  host: '<hostname>',
  port: '<port>',
  user: '<username>',
  password: '<password>',
  database: '<database_name>',
});

// Function to read and process the data.json file
async function processJSONFile(folderPath) {
  const filePath = path.join(folderPath, 'data.json');
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileData);

    const bowTitle = jsonData['bow-title'];
    const bowLink = jsonData['bow-link'];
    const samples = jsonData['samples'];

    const client = await pool.connect();

    try {
      // Insert the BowType data
      await client.query(
        'INSERT INTO BowTypes (BowTitle, BowLink) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [bowTitle, bowLink],
      );

      // Retrieve the BowTypeID for the inserted BowType
      const bowTypeResult = await client.query(
        'SELECT BowTypeID FROM BowTypes WHERE BowTitle = $1',
        [bowTitle],
      );
      const bowTypeID = bowTypeResult.rows[0].BowTypeID;

      // Insert the Samples data
      for (const sample of samples) {
        const {
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
          dfData,
          centralDifferences,
          regressionEstimation,
          longbowPoint,
          storedEnergy,
        } = sample;

        await client.query(
          `
          INSERT INTO Samples (
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
            dfData,
            centralDifferences,
            regressionEstimation,
            longbowPoint,
            storedEnergy
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
        `,
          [
            bowTypeID,
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
            dfData,
            centralDifferences,
            regressionEstimation,
            longbowPoint,
            storedEnergy,
          ],
        );
      }

      console.log(`Data inserted successfully for bow: ${bowTitle}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`Error processing JSON file: ${filePath}`);
    console.error(error);
  }
}

// Function to iterate through subfolders and process the data
function processSubfolders(rootFolder) {
  const subfolders = fs.readdirSync(rootFolder);

  subfolders.forEach((subfolder) => {
    const folderPath = path.join(rootFolder, subfolder);

    if (fs.statSync(folderPath).isDirectory()) {
      processJSONFile(folderPath);
    }
  });
}

// Specify the root folder containing the subfolders with data.json files
const rootFolder = './bows';

// Call the function to process the subfolders
processSubfolders(rootFolder);
