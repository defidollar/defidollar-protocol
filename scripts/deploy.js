const config = require('config')
const assert = require('assert')

const Pool = artifacts.require('Pool');

const Core = artifacts.require("Core");
const AavePlugin = artifacts.require("AavePlugin");
const UniswapPlugin = artifacts.require("UniswapPlugin");
const BPool = artifacts.require("BPool");
const Reserve = artifacts.require("Reserve");
const IAToken = artifacts.require("MockIAToken");
const Aggregator = artifacts.require("MockAggregator");
const Oracle = artifacts.require("Oracle");
const ILendingPool = artifacts.require("ILendingPool");

const MAX = web3.utils.toTwosComplement(-1);
const NUM_RESERVES = 2;

async function execute() {
  const accounts = await web3.eth.getAccounts()
  const reserves = [
    await Reserve.at(config.get('contracts.tokens.DAI')),
    await Reserve.at(config.get('contracts.tokens.TUSD'))
  ]
  const aTokens = [
    await IAToken.at(config.get('contracts.aave.aDAI')),
    await IAToken.at(config.get('contracts.aave.aTUSD')),
  ]
  const aggregators = [
    await Aggregator.at(config.get('contracts.chainlink.DAI-ETH')),
    await Aggregator.at(config.get('contracts.chainlink.TUSD-ETH')),
  ]

  const lendingPool = await ILendingPool.at(config.get('contracts.aave.lendingPool'))

  let oracle
  if (config.has('contracts.defidollar.oracle')) {
    oracle = await Oracle.at(config.get('contracts.defidollar.oracle'))
  } else {
    console.log('Deploying Oracle...')
    oracle = await Oracle.new(aggregators.map(a => a.address), config.get('contracts.chainlink.ETH-USD')) // _ethUsdAggregator
    console.log('Deployed Oracle at: ', oracle.address)
  }

  let bpool
  if (config.has('contracts.defidollar.bpool')) {
    bpool = await BPool.at(config.get('contracts.defidollar.bpool'))
  } else {
    console.log('Deploying BPool...')
    bpool = await BPool.new()
    console.log('Deployed BPool at:', bpool.address)
  }

  let pool
  const amount = web3.utils.toWei('50')
  const weight = web3.utils.toWei('10') // giving equal weight to each coin
  if (config.has('contracts.defidollar.pool')) {
    pool = await Pool.at(config.get('contracts.defidollar.pool'))
  } else {
    console.log('Deploying Pool...')
    pool = await Pool.new(
      bpool.address,
      // config.get('contracts.balancer.bFactory'),
      aTokens.map(a => a.address), // tokens
      (new Array(NUM_RESERVES)).fill(amount), // startBalances
      (new Array(NUM_RESERVES)).fill(weight), // startWeights
      (new Array(NUM_RESERVES)).fill(weight) // endWeights
    )
    console.log('Deployed Pool at:', pool.address)
    await bpool.setController(pool.address)
    console.log('token approvals...')
    const approvals = []
    for (let i = 0; i < NUM_RESERVES; i++) {
      approvals.push(aTokens[i].approve(pool.address, MAX))
      // const balance = await aTokens[i].balanceOf(accounts[0])
      // const allowance = await aTokens[i].allowance(accounts[0], pool.address)
      // console.log({ balance: balance.toString(), allowance: allowance.toString() })
    }
    await Promise.all(approvals)
    console.log('token completed...')

    const initialSupply = web3.utils.toBN(amount).mul(web3.utils.toBN(NUM_RESERVES)) // assuming each coin is $1
    await pool.createPool(initialSupply)
    assert.equal((await pool.balanceOf(accounts[0])).toString(), initialSupply.toString())
  }


  // Deploy Core
  let core
  if (config.has('contracts.defidollar.core')) {
    core = await Core.at(config.get('contracts.defidollar.core'))
  } else {
    console.log('Deploying Core...')
    core = await Core.new(
      reserves.map(r => r.address),
      aTokens.map(r => r.address),
      pool.address,
      oracle.address
    )
    console.log('Deployed Core at:', core.address)
    console.log('Setting pool controller to', core.address)
    await pool.setController(core.address)
  }

  let aave
  if (config.has('contracts.defidollar.aave')) {
    aave = await AavePlugin.at(config.get('contracts.defidollar.aave'))
  } else {
    console.log('Deploying Aave...')
    aave = await AavePlugin.new(
      reserves.map(r => r.address),
      aTokens.map(r => r.address),
      lendingPool.address,
      config.get('contracts.aave.lendingPoolCore'),
      core.address,
      pool.address
    )
    console.log('Deployed Aave at:', aave.address)
  }

  // const uniswapPlugin = await UniswapPlugin.new(
  //   config.get('contracts.uniswap.router'),
  //   aave.address,
  //   pool.address
  // )
}

module.exports = async function (callback) {
  try {
    await execute()
  } catch (e) {
    // truffle exec <script> doesn't throw errors, so handling it in a verbose manner here
    console.log(e)
  }
  callback()
}
