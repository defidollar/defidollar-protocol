const fs = require('fs')
const utils = require('../utils/utils')

const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
const toBN = web3.utils.toBN;
const MAX = web3.utils.toTwosComplement(-1);

async function runSimulation() {
  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const user1 = accounts[1]

  const _artifacts = await utils.getArtifacts(artifacts, { oracle: true })
  const numReserves = _artifacts.reserves.length

  // const coins = ['usd-coin', 'tether']
  // const coins = ['usd-coin', 'true-usd']
  // const coins = ['dai', 'usd-coin']
  const coins = ['dai', 'nusd']
  const data = {}
  const deviations = { dusd: 0 }
  for (let i = 0; i < coins.length; i++) {
    const id = coins[i]
    data[id] = JSON.parse(fs.readFileSync(`./data/coingecko/${id}.json`)).prices//.slice(0, 5)
    deviations[id] = 0
  }

  let numPricePoints = data[coins[0]].length
  for (let j = 0; j < numReserves; j++) {
    await _artifacts.aTokens[j].mint(_artifacts.core.address, toWei('15000')) // 15% of initial supply
  }
  console.log(`Simulating for ${numPricePoints} price points...`)
  let profit = 0
  // oracles use price relative to eth
  // let that be constant at $200
  const ethPrice = toBN(200)
  // The latestAnswer value for all USD reference data contracts is multiplied by 100000000 before being written on-chain and
  // by 1000000000000000000 for all ETH pairs.
  await _artifacts.ethAggregator.setLatestAnswer(ethPrice.mul(toBN(100000000)))

  await _artifacts.aTokens[0].approve(_artifacts.bpool.address, MAX, { from: user1 })
  await _artifacts.aTokens[1].approve(_artifacts.bpool.address, MAX, { from: user1 })
  let mp1 = 0, mp2 = 0, m1 = 2, m2 = 2
  for (let i = 0; i < numPricePoints; i++) {
    deviations[coins[0]] += Math.abs(data[coins[0]][i][1] - 1)
    deviations[coins[1]] += Math.abs(data[coins[1]][i][1] - 1)
    m1 = Math.min(m1, data[coins[0]][i][1])
    m2 = Math.min(m2, data[coins[1]][i][1])
    const _prices = [ data[coins[0]][i][1], data[coins[1]][i][1] ]
    const poolSize_0 = weiToFloatEther(await _artifacts.aTokens[0].balanceOf(_artifacts.bpool.address))
    const poolSize_1 = weiToFloatEther(await _artifacts.aTokens[1].balanceOf(_artifacts.bpool.address))
    const spotPriceOf_0_1 = poolSize_1 / poolSize_0
    const newSpotPriceOf_0_1 = data[coins[0]][i][1] / data[coins[1]][i][1]
    let desiredSpotRatio = newSpotPriceOf_0_1 / spotPriceOf_0_1
    let tokenIn = 1
    let tokenOut = 0
    if (desiredSpotRatio == 1) continue;
    if (desiredSpotRatio < 1) {
      tokenIn = 0
      tokenOut = 1
      desiredSpotRatio = 1 / desiredSpotRatio
    }
    const tokenInPoolSize = weiToFloatEther(await _artifacts.aTokens[tokenIn].balanceOf(_artifacts.bpool.address))
    let tokenAmountIn = tokenInPoolSize * (Math.sqrt(desiredSpotRatio) - 1)
    if (tokenAmountIn > tokenInPoolSize / 2) { // to avoid ERR_MAX_IN_RATIO
      tokenAmountIn = tokenInPoolSize / 2
    }
    const tokenInBalance = weiToFloatEther(await _artifacts.aTokens[tokenIn].balanceOf(user1))
    if (tokenInBalance < tokenAmountIn) {
      await _artifacts.aTokens[tokenIn].mint(user1, floatToWei(tokenAmountIn - tokenInBalance + 1), { from: admin })
    }
    let { tokenAmountOut } = await _artifacts.bpool.swapExactAmountIn.call(
      _artifacts.aTokens[tokenIn].address,
      floatToWei(tokenAmountIn),
      _artifacts.aTokens[tokenOut].address,
      0, // minAmountOut
      MAX, // maxPrice
      { from: user1 }
    )
    await _artifacts.bpool.swapExactAmountIn(
      _artifacts.aTokens[tokenIn].address,
      floatToWei(tokenAmountIn),
      _artifacts.aTokens[tokenOut].address,
      0, // minAmountOut
      MAX, // maxPrice
      { from: user1 }
    )
    tokenAmountOut = weiToFloatEther(tokenAmountOut)
    const _profit = tokenAmountOut * _prices[tokenOut] - tokenAmountIn * _prices[tokenIn]
    profit += _profit

    for (let j = 0; j < numReserves; j++) {
      // push price relative to eth
      const price = toBN(floatToWei(data[coins[j]][i][1])).div(ethPrice)
      await _artifacts.aggregators[j].setLatestAnswer(price)
    }
    console.log('rebalancing...')
    await _artifacts.core.reBalance()
    const newCoinValue = await getCoinValue(
      _prices,
      _artifacts.aTokens,
      _artifacts.bpool.address,
      weiToFloatEther(await _artifacts.pool.totalSupply())
    )
    deviations.dusd += Math.abs(newCoinValue - 1)
    console.log(i, { _prices, poolSize_0, poolSize_1, tokenIn, tokenOut, desiredSpotRatio, tokenInPoolSize, tokenAmountIn, tokenAmountOut, _profit, newCoinValue })
    mp1 = Math.max(mp1, poolSize_0)
    mp2 = Math.max(mp2, poolSize_1)
  }
  console.log({ deviations, profit, maxPoolSize1: mp1, maxPoolSize2: mp2 })
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