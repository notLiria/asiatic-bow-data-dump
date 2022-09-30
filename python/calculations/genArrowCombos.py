from .ingestData import *

def genArrowCombos(): 
    rawArrowData = getAllArrowData()
    allCombos = []
    for i in range(len(rawArrowData)): 
        allCombos.append(genCombosForShaft(rawArrowData[i], rawArrowData[i + 1:]))
    
    #for shaft in rawArrowData: 
        #allCombos.append(genCombosForShaft(shaft, [x for x in rawArrowData if x != shaft]))
    allCombos = list(filter(lambda x: (len(x) > 0), allCombos))
    allCombos = [item for sublist in allCombos for item in sublist]
    res = []
    [res.append(x) for x in allCombos if x not in res]
    return res



def genCombosForShaft(shaft, rest): 
    # Treat shaft as being the inner
    combos = []
    for outerCandidate in rest: 
        if shaft['OD'] < outerCandidate['ID'] and shaft['OD'] >= (outerCandidate['ID'] - 0.004): 
            combos.append([shaft, outerCandidate])
    return combos