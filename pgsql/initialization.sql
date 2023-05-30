-- BowTypes table
CREATE TABLE BowTypes (
   BowTypeID SERIAL PRIMARY KEY,
   BowTitle VARCHAR(255) NOT NULL,
   BowLink VARCHAR(255),
   CONSTRAINT uk_bowtitle UNIQUE (BowTitle)
);

-- Samples table
CREATE TABLE Samples (
   SampleID SERIAL PRIMARY KEY,\
   BowTypeID INT NOT NULL,
   UnstrungLength FLOAT,
   StrungLength FLOAT,
   MinBoxDimLength FLOAT,
   MinBoxWidth FLOAT,
   MinBoxDepth FLOAT,
   SiyahEffectiveTopLength FLOAT,
   SiyahEffectiveBottomLength FLOAT,
   SiyahEffectiveTopAngle FLOAT,
   SiyahEffectiveBottomAngle FLOAT,
   BowMass INT,
   GripLength FLOAT,
   GripWidth FLOAT,
   GripDepth FLOAT,
   MaxLimbThickness FLOAT,
   MinLimbThickness FLOAT,
   MaxLimbWidth FLOAT,
   MinLimbWidth FLOAT,
   ArrowPassWidth FLOAT,
   MaxDraw INT,
   StockStringLengthMin FLOAT,
   StockStringLengthMax FLOAT,
   BraceHeight FLOAT,
   ContributorContactType VARCHAR(255),
   ContributorContactInfo VARCHAR(255),
   ManufactureDate DATE,
   MeasurementDate DATE,
   Comments TEXT,
   Asym BOOLEAN,
   AsymLengthTop FLOAT,
   AsymLengthBottom FLOAT,
   DfData JSONB,
   CentralDifferences JSONB,
   RegressionEstimation JSONB NOT NULL,
   LongbowPoint INT,
   StoredEnergy FLOAT[][]
);
