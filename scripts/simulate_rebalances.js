const fs = require('fs')

const BPool = artifacts.require('BPool');
const BFactory = artifacts.require('BFactory');

const Core = artifacts.require("Core");
const DefiDollarToken = artifacts.require("DefiDollarToken");
const Reserve = artifacts.require("Reserve");
const MockIAToken = artifacts.require("MockIAToken");
const Oracle = artifacts.require("Oracle");
const Aggregator = artifacts.require("MockAggregator");

const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
const toBN = web3.utils.toBN;
const MAX = web3.utils.toTwosComplement(-1);

async function runSimulation() {
  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const user1 = accounts[1]

  this.core = await Core.deployed()
  this.bpool = await BPool.at(await this.core.bpool())
  this.bFactory = await BFactory.deployed()
  this.defiDollarToken = await DefiDollarToken.deployed()
  this.numReserves = await this.core.numReserves()
  this.oracle = await Oracle.at(await this.core.oracle())
  this.reserves = []
  this.aTokens = []
  this.aggregators = []
  for (let i = 0; i < this.numReserves; i++) {
    this.reserves.push(await Reserve.at(await this.core.reserves(i)))
    this.aTokens.push(await MockIAToken.at(await this.core.reserveToAtoken(this.reserves[i].address)))
    await this.aTokens[i].mint(this.core.address, toWei('100000'), { from: admin })
    this.aggregators.push(await Aggregator.at(await this.oracle.refs(i)))
  }

  // const coins = ['usd-coin', 'tether']
  // const coins = ['usd-coin', 'true-usd']
  const coins = ['dai', 'usd-coin']
  // const coins = ['dai', 'nusd']
  const data = {}
  const deviations = { dusd: 0 }
  for (let i = 0; i < coins.length; i++) {
    const id = coins[i]
    data[id] = JSON.parse(fs.readFileSync(`./data/coingecko/${id}.json`)).prices//.slice(0, 5)
    deviations[id] = 0
  }

  let numPricePoints = data[coins[0]].length

  console.log(`Simulating for ${numPricePoints} price points...`)
  let profit = 0
  await this.aTokens[0].approve(this.bpool.address, MAX, { from: user1 })
  await this.aTokens[1].approve(this.bpool.address, MAX, { from: user1 })
  for (let i = 0; i < numPricePoints; i++) {
    for (let j = 0; j < this.numReserves; j++) {
      await this.aggregators[j].setLatestAnswer(floatToWei(data[coins[j]][i][1]))
    }
    await this.core.reBalance()
    const _prices = [ data[coins[0]][i][1], data[coins[1]][i][1] ]
    const poolSize_0 = parseFloat(fromWei(await this.aTokens[0].balanceOf(this.bpool.address)))
    const poolSize_1 = parseFloat(fromWei(await this.aTokens[1].balanceOf(this.bpool.address)))
    deviations[coins[0]] += Math.abs(data[coins[0]][i][1] - 1)
    deviations[coins[1]] += Math.abs(data[coins[1]][i][1] - 1)
    const newCoinValue = await getCoinValue(
      _prices,
      this.aTokens,
      this.bpool.address,
      weiToFloatEther(await this.defiDollarToken.totalSupply())
    )
    deviations.dusd += Math.abs(newCoinValue - 1)
    console.log(i, { _prices, poolSize_0, poolSize_1, newCoinValue })
  }
  console.log({ deviations, profit })
}

async function getCoinValue(prices, aTokens, bpool, supply) {
  let value = 0
  for (let i = 0; i < prices.length; i++) {
    const poolSize = weiToFloatEther(await aTokens[i].balanceOf(bpool))
    value += (poolSize * prices[i])
  }
  return value / supply
}

function weiToFloatEther(num) {
  return parseFloat(fromWei(num))
}

function floatToWei(num) {
  return toWei(num.toString())
}

module.exports = async function (callback) {
  try {
    await runSimulation()
  } catch (e) {
    // truffle exec <script> doesn't throw errors, so handling it in a verbose manner here
    console.log(e)
  }
  callback()
}
