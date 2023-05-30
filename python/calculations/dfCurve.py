from tkinter import Y
from .ingestData import *
import numpy as np
from findiff import FinDiff
import matplotlib.pyplot as plt
from scipy import integrate
from scipy.optimize import curve_fit
from lmfit import Model

def exponentialDfFunc(x, coeffs): 
    # Takes coefficients in the form of lambda1, lambda2, p0, p1, c, for the derivative
    return coeffs[2]/coeffs[0] * np.exp(coeffs[0] * x) + coeffs[3]/coeffs[1] * np.exp(coeffs[1] * x) + coeffs[4]

def stringifyPolynomial(poly):
    # Assumes that poly is a power series
    output = ''
    for i in range(len(poly) - 1):
        output += str(poly[i]) + 'x^' + str(len(poly) - i) + ' + '
    return output + str(poly[-1])

def calcEnergy(coeffs, dfData):
    xVals = [sample['x'] for sample in dfData]
    yVals = [exponentialDfFunc(x, coeffs) /0.22481 for x in xVals]
    totalEnergy = np.trapz(yVals, dx = 0.0254)
    return totalEnergy

def calcEnergyAtPoint(regressionCoeffs, dfData, dLToBelly):
    # Assume regression coefficients are in the format of [l[0], l[1], P[0], P[1], constant]
    originalX = [point['x'] for point in dfData]
    if (dLToBelly > max(originalX) or dLToBelly < min(originalX) ):
        print(originalX)
        print(dLToBelly)
        raise Exception('Draw length out of bounds')
    xVals = np.linspace(min(originalX), dLToBelly, 100)
    dX = (dLToBelly - min(originalX))/50
    yVals = [exponentialDfFunc(x, regressionCoeffs) for x in xVals]
    return np.trapz(yVals, x = xVals) * 0.113

def calcCentralDifferences(dfData):
    dx = FinDiff(0, 1, 1, acc=4)
    xVals = np.asarray([point['x'] for point in dfData])
    yVals = np.asarray([point['y'] for point in dfData])
    centralDifferences = dx(yVals)
    output = [{'x': float(xVal), 'y': float(yVal)} for xVal, yVal in zip(xVals, centralDifferences)]
    return output


def calcProjectileEnergy(fpsDataPoint):
    # Assume that data looks like {fps: #, gpp: #, dl: # }
    v = fpsDataPoint['fps'] * 0.3048
    m = fpsDataPoint['arrow-weight'] * 6.4798910000174E-5
    energy = 1/2 * m * v * v
    return energy

def fitFpsGppData(fpsData):
    # Assume that data looks like {fps: #, gpp: #, dl: #}
    dlGroups = [*set([sample['dl'] for sample in fpsData])]
    output = {}
    for dl in dlGroups:
        dlKey = str(dl)
        output[dlKey] = {}
        xVals = np.asarray([sample['gpp'] for sample in fpsData])
        yVals = np.asarray([sample['fps'] for sample in fpsData])
        regressionEqn = np.polyfit(xVals, yVals, 1)
        output[dlKey]['coeffs'] = regressionEqn.tolist()
        output[dlKey]['fitted-line'] = list([{'x' : float(x), 'y': float(np.polyval(regressionEqn, x))} for x in [*set(xVals)]])
    return output

def getLongbowPoint(dfData, regressionCoeffs):
    def getLine(p1, p2):
        return np.polyfit([p1['x'], p2['x']], [p1['y'], p2['y']], 1)

    def getValAtPoint(coeffs, x):
        return exponentialDfFunc(x, coeffs)

    def integrateLineUpToX (coeffs, x): 
        xVals = np.linspace(dfData[0]['x'], x)
        yVals = [np.polyval(coeffs, xVal) for xVal in xVals]
        return np.trapz(yVals, x = xVals) * 0.113
    
    def integrateDfCurveUpToX(coeffs, x): 
        return calcEnergyAtPoint(coeffs, dfData, x)

    xVals = [sample['x'] for sample in dfData]
    areaYs = []
    for curX in xVals[:-1]:
        lineCoeffs = getLine(dfData[0], {'x': curX, 'y': getValAtPoint(regressionCoeffs, curX)})
        areaUnderLine = integrateLineUpToX(lineCoeffs, curX)
        areaUnderCurve = integrateDfCurveUpToX(regressionCoeffs, curX)
        areaDiff = areaUnderCurve - areaUnderLine
        areaYs.append(areaDiff)
    indexesOfChange = np.where(np.diff(np.sign(areaYs)) != 0)[0] + 1
    if (len(indexesOfChange) == 0) or(indexesOfChange[-1] < 5):  
        return -1
    supposedChange = xVals[indexesOfChange[-1] - 1]   
    if (supposedChange <= 10):
        return -1
    return supposedChange

def exponentiallyFitDfData(dfData):
    output = {}
    def derivativeFunc(x, lambda_1, lambda_2, p1, p2 ):
        return p1 *  np.exp(lambda_1 * x ) + p2 * np.exp(lambda_2 * x) 
    xVals = np.asarray([point['x'] for point in dfData])
    yVals = np.asarray([point['y'] for point in dfData])
    centralDiffs = [point['y'] for point in calcCentralDifferences(dfData)]
    iy1 = np.asarray(integrate.cumtrapz(centralDiffs, xVals, initial = 0))
    iy2 = np.asarray(integrate.cumtrapz(iy1, xVals, initial = 0))
    Y = np.column_stack((iy1, iy2, xVals, np.ones(len(xVals))))
    pseudoInv = np.linalg.pinv(Y)
    A = pseudoInv.dot(centralDiffs)
    eigArray = np.vstack(([A[0], A[1]], [1, 0]))
    lambdas, _ = np.linalg.eig(eigArray)
    X = np.column_stack(( np.exp(lambdas[0] * xVals), np.exp(lambdas[1] * xVals)))
    P = np.linalg.pinv(X).dot(centralDiffs)
    if True in np.iscomplex(lambdas) or True in np.iscomplex(P): 
        lambdas = [1, 1]
        P = [1, 1]
    def dfFunc(x, c): 
        return (P[0]/lambdas[0]) * np.exp(lambdas[0] * x) + (P[1]/lambdas[1]) * np.exp(lambdas[1] * x) + c
    popt, _ = curve_fit(dfFunc, xVals, yVals)
    output['df-curve'] = [{'x': str(x), 'y': float(dfFunc(x, *popt))} for x in xVals]
    output['coeffs']  = [*list(lambdas), *list(P), *list(popt)] # Note that these are coeffs for the derivative
    output['regression-eqn'] = str(P[0]/lambdas[0]) + "e^(" + str(lambdas[0]) + "x) + " + str(P[1]/lambdas[1]) + "e^(" + str(lambdas[1]) + "x) + " + str(*popt)
    output['regression-derivative'] = str(P[0]) + 'e^' + str(lambdas[0]) + "x + "  + str(P[1]) + "e^" + str(lambdas[1]) + "x"
    output['regression-derivative-values'] = [{'x': str(x), 'y': float(derivativeFunc(x, *[*lambdas, *P]))} for x in xVals]
    return output


def estimateVMass(sample): 
    def virtualMassEstimator(w, mA, r, K): 
        return np.sqrt((2 * w * mA * (1 - r))/(mA * (K + mA)))

    def virtualMassEstimatorTwo(K, w, eHist, mA): 
        return np.sqrt(2 * (w - eHist)/(K + mA))

    estimator = Model(virtualMassEstimator, independent_vars=['w',  'mA'])
    estimator2 = Model(virtualMassEstimatorTwo, independent_vars=['w',  'mA', 'eHist'])
    estimator.set_param_hint('r', min = 0, max = 1)
    estimator.set_param_hint('K', min = 0, max=100)
    fpsData = sample['fps-data']
    peBows = np.asarray([point['stored-energy'] for point in fpsData])
    mArrows = np.asarray([point['arrow-weight'] *  6.4798910000174E-5 for point in fpsData])
    vArrows = np.asarray([point['fps'] * 0.3048 for point in fpsData])
    keArrows = np.asarray([point['measured-energy'] for point in fpsData])
    
    fit = estimator.fit(vArrows, w = peBows, mA = mArrows)
    estimator2.set_param_hint('K', min = 0, max = 1, value = 0.002)
    #rVals = [fit.best_values['r'] for point in fpsData]
    
    #print(fit2.fit_report())
    hysteresis = fit.best_values['r']
    eHist = peBows - hysteresis * peBows - keArrows
    #print(eHist)
    fit2 = estimator2.fit(vArrows, w = peBows, eHist=eHist, mA = mArrows)
    #print(fit2.fit_report())
#    print(energyLost)
    
    #print(hysteresis)
    #print(vMass)
    return {'hysteresis': float(fit.best_values['r']), 'virtual-mass': float(fit2.best_values['K'])}

def start():
    print('hello world2')
