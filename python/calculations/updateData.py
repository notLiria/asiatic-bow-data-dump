from re import S
from .ingestData import *
from .genArrowCombos import *
from .dfCurve import *
from pprint import pprint
import json

def addRegressionDataToSample(sample):
    sample['central-differences'] = calcCentralDifferences(sample['df-data'])
    regressionData = exponentiallyFitDfData(sample['df-data'])
    pprint(regressionData)
    sample['regression-estimation'] = regressionData
    sample['longbow-point'] = getLongbowPoint(sample['df-data'], regressionData['coeffs'])
    return sample

def addProjectileEnergies(sample): 
    maxDl = sample['df-data'][-1]['x']
    sample['stored-energy'] = {}
    try: 
        sample['stored-energy']['28'] = calcEnergyAtPoint(sample['regression-estimation']['coeffs'], sample['df-data'], 28)
        sample['stored-energy'][str(maxDl)] = calcEnergyAtPoint(sample['regression-estimation']['coeffs'], sample['df-data'], maxDl)
        sample['stored-energy'][str((maxDl + 28)/2)] = calcEnergyAtPoint(sample['regression-estimation']['coeffs'], sample['df-data'], (maxDl + 28)/2)
    except Exception as e: 
        raise Exception('Issue occured with sample' + str(sample))

    if 'fps-data' in sample: 
        sample['regression-estimation']['fps-data'] = fitFpsGppData(sample['fps-data'])
        for idx, point in enumerate(sample['fps-data']): 
            measuredEnergyAtPoint = calcProjectileEnergy(point)
            dl = point['dl']
            if (sample['grip-dim']): 
                if (sample['grip-dim']['thickness']): 
                    dl = dl - sample['grip-dim']['thickness']/25.4
            calculatedEnergyAtPoint = calcEnergyAtPoint(sample['regression-estimation']['coeffs'], sample['df-data'], dl)
            sample['fps-data'][idx]['measured-energy'] = measuredEnergyAtPoint
            sample['fps-data'][idx]['stored-energy'] = calculatedEnergyAtPoint
            sample['fps-data'][idx]['efficiency'] = (measuredEnergyAtPoint / calculatedEnergyAtPoint ) * 100                
            sample['fps-data'][idx]['dl-to-belly'] = dl
        estimatedParameters = estimateVMass(sample)
        sample['regression-estimation']['other-parameters'] = estimatedParameters
    return sample

def updateData(): 
    listOfBows = getBowModels()
    for i in range(len(listOfBows)): 
        bowData = getBowData(listOfBows[i])
        if 'skip-calcs' not in bowData: 
            try: 
                for idx, sample in enumerate(bowData['samples']): 
                        bowData['samples'][idx] = addRegressionDataToSample(bowData['samples'][idx])
                        bowData['samples'][idx] = addProjectileEnergies(bowData['samples'][idx])
                f = open(os.path.abspath(os.path.join(listOfBows[i], 'data.json')), 'w')
                f.write(json.dumps(bowData))
            except Exception as e: 
                print('Error occured with bow data: ' + str(listOfBows[i]))
                print(e)
            

def latestExperiment(): 
    bowData = getBowData('../data/bows/alibow_segye_lam')    
    sample = bowData['samples'][0]
    sample = addRegressionDataToSample(sample)
    sample = addProjectileEnergies(sample)
    pprint(sample)


    #bowData['samples'][0] = addRegressionDataToSample(bowData['samples'][0])
     #fitFpsGppData(bowData['samples'][0]['fps-data'])
    """
    listOfBows = getBowModels()
    for i in range(len(listOfBows)): 
        bowData = getBowData(listOfBows[i])
        sampleData = bowData['samples'][0]
        exponentiallyFitDfData(sampleData['df-data'], bowData['bow-title'])
"""