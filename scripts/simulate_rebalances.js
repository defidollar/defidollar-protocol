const fs = require('fs')
const utils = require('../utils/utils')

const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
const toBN = web3.utils.toBN;
const MAX = web3.utils.toTwosComplement(-1);

async function runSimulation() {
  // const admin = accounts[0]

  const _artifacts = await utils.getArtifacts(artifacts, { oracle: true })
  const numReserves = _artifacts.reserves.length
  // const coins = ['usd-coin', 'tether']
  // const coins = ['usd-coin', 'true-usd']
  // const coins = ['dai', 'nusd']
  const coins = ['dai', 'usd-coin']
  const data = {}
  const deviations = { dusd: 0 }
  for (let i = 0; i < coins.length; i++) {
    const id = coins[i]
    data[id] = JSON.parse(fs.readFileSync(`./data/coingecko/${id}.json`)).prices//.slice(0, 5)
    deviations[id] = 0
  }

  const numPricePoints = data[coins[0]].length
  for (let j = 0; j < numReserves; j++) {
    await _artifacts.aTokens[j].mint(_artifacts.core.address, toWei('15000')) // 15% of initial supply
  }
  console.log(`Simulating for ${numPricePoints} price points...`)
  let profit = 0
  for (let i = 0; i < numPricePoints; i++) {
    for (let j = 0; j < numReserves; j++) {
      await _artifacts.aggregators[j].setLatestAnswer(floatToWei(data[coins[j]][i][1]))
      console.log(i, j, {
        core: weiToFloatEther(await _artifacts.aTokens[j].balanceOf(_artifacts.core.address)),
        pool: weiToFloatEther(await _artifacts.aTokens[j].balanceOf(_artifacts.pool.address)),
        bpool: weiToFloatEther(await _artifacts.aTokens[j].balanceOf(_artifacts.bpool.address))
      })
    }
    console.log((await _artifacts.oracle.getPriceFeed()).map(weiToFloatEther))
    const r = await _artifacts.core.reBalance()
    // printReBalance(r)
    const _prices = [ data[coins[0]][i][1], data[coins[1]][i][1] ]
    const poolSize_0 = weiToFloatEther(await _artifacts.aTokens[0].balanceOf(_artifacts.bpool.address))
    const poolSize_1 = weiToFloatEther(await _artifacts.aTokens[1].balanceOf(_artifacts.bpool.address))
    deviations[coins[0]] += Math.abs(data[coins[0]][i][1] - 1)
    deviations[coins[1]] += Math.abs(data[coins[1]][i][1] - 1)
    const newCoinValue = await getCoinValue(
      _prices,
      _artifacts.aTokens,
      _artifacts.bpool.address,
      weiToFloatEther(await _artifacts.pool.totalSupply())
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
  return parseFloat(fromWei(num.toString()))
}

function floatToWei(num) {
  return toWei(num.toString())
}

function printReBalance(r) {
  r.logs.forEach(l => {
    if (l.event === "DEBUG") {
      console.log(
        { a: weiToFloatEther(l.args.a), b: weiToFloatEther(l.args.b), c: weiToFloatEther(l.args.c) },
        l.logIndex
      )
    } else if (l.event === "DEBUG2") {
      console.log(l)
    } else if (l.event === "DEBUG3") {
      console.log(
        { e: weiToFloatEther(l.args.e), f: weiToFloatEther(l.args.f), g: weiToFloatEther(l.args.g) },
        l.logIndex
      )
    }
    else if (l.event === "DEBUG4") {
      console.log(l)
    }
  });
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
