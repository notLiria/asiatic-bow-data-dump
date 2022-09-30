import os
import json

def getBowModels(): 
    dataDir = [f.path for f in os.scandir(os.path.abspath('../server/data/bows')) if f.is_dir()]
    return dataDir
    

def getBowData(bowPath): 
    f = open(os.path.abspath(os.path.join(bowPath, 'data.json')))
    return json.load(f)


def getAllArrowData(): 
    f = open(os.path.abspath('../server/data/arrows/arrowData.json'))
    props = ['OD', 'ID', 'GPI']
    arrowData = json.load(f)
    arrowData = list(filter(lambda shaft: (shaft['OD'] != 'unknown' and shaft['ID'] != 'unknown'), arrowData))
    for i, el in enumerate(arrowData): 
        for prop in props: 
            arrowData[i][prop] = float(el[prop])
    return arrowData

