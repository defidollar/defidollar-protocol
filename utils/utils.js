let _artifacts

async function getArtifacts(artifacts, options = {}) {
  const Pool = artifacts.require('Pool');
  const BPool = artifacts.require('BPool');

  const Core = artifacts.require("Core");
  const AavePlugin = artifacts.require("AavePlugin");
  const Reserve = artifacts.require("Reserve");
  const IAToken = artifacts.require("MockIAToken");
  const Aggregator = artifacts.require("MockAggregator");
  const Oracle = artifacts.require("Oracle");

  if (!_artifacts) {
    _artifacts = {}
    _artifacts.core = await Core.deployed()
    _artifacts.pool = await Pool.at(await _artifacts.core.pool())
    _artifacts.bpool = await BPool.at(await _artifacts.pool._bPool())
    const numReserves = await _artifacts.core.numReserves()
    if (options.oracle) {
      _artifacts.oracle = await Oracle.at(await _artifacts.core.oracle())
      _artifacts.aggregators = []
    }
    _artifacts.reserves = []
    _artifacts.aTokens = []
    for (let i = 0; i < numReserves; i++) {
      _artifacts.reserves.push(await Reserve.at(await _artifacts.core.reserves(i)))
      _artifacts.aTokens.push(await IAToken.at(await _artifacts.core.aTokens(i)))
      if (options.oracle) {
        _artifacts.aggregators.push(await Aggregator.at(await _artifacts.oracle.refs(i)))
      }
    }
    _artifacts.aave = await AavePlugin.deployed()
  }
  return _artifacts
}

module.exports = { getArtifacts }
