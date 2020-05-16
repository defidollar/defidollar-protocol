const assert = require('assert')

const MockLendingPool = artifacts.require("MockLendingPool");
const aToken = artifacts.require("MockIAToken");

const TMath = artifacts.require('TMath');
// const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');

const Core = artifacts.require("Core");
const AavePlugin = artifacts.require("AavePlugin");
const UniswapPlugin = artifacts.require("UniswapPlugin");
const MockUniswap = artifacts.require("MockUniswap");
const Reserve = artifacts.require("Reserve");
const Oracle = artifacts.require("Oracle");
const Aggregator = artifacts.require("MockAggregator");
const Pool = artifacts.require('Pool');

const NUM_RESERVES = parseInt(process.env.NUM_RESERVES) || 2;

module.exports = async function (deployer, network, accounts) {
  console.log('running migrations...')
  const admin = accounts[0]

  // Deploy erc20 reserves
  const reserves = []
  for (let i = 0; i < NUM_RESERVES; i++) {
    reserves.push(await Reserve.new())
  }

  // Deploy ATokens and oracle price aggregators
  const aTokens = []
  const aggregators = []
  const lendingPool = await MockLendingPool.new(reserves.map(r => r.address))
  for (let i = 0; i < NUM_RESERVES; i++) {
    aTokens.push(await aToken.at(await lendingPool.rToA(reserves[i].address)))
    aggregators.push(await Aggregator.new())
  }
  // console.log({aTokens: aTokens.map(a => a.address)})

  // Deploy actual oracle
  const ethUsdAgg = await Aggregator.new()
  await deployer.deploy(Oracle, aggregators.map(a => a.address), ethUsdAgg.address)
  const oracle = await Oracle.deployed()

  // Deploy Balancer things
  await deployer.deploy(TMath);
  // await deployer.deploy(BFactory);
  await deployer.deploy(BPool);
  const bPool = await BPool.deployed()

  // Balancer Pool
  const amount = web3.utils.toWei(process.env.INITIAL_AMOUNT || '50') // of each
  const weight = web3.utils.toWei('10') // giving equal weight to each coin
  await deployer.deploy(
    Pool,
    BPool.address, // passing bpool address instead
    // BFactory.address, // factoryAddress
    aTokens.map(a => a.address), // tokens
    (new Array(NUM_RESERVES)).fill(amount), // startBalances
    (new Array(NUM_RESERVES)).fill(weight), // startWeights
    (new Array(NUM_RESERVES)).fill(weight) // endWeights
  );
  const pool = await Pool.deployed()
  bPool.setController(pool.address)

  for (let i = 0; i < NUM_RESERVES; i++) {
    await aTokens[i].mint(admin, amount)
    await aTokens[i].approve(pool.address, amount)
  }
  const initialSupply = web3.utils.toBN(amount).mul(web3.utils.toBN(NUM_RESERVES)) // assuming each coin is $1
  await pool.createPool(initialSupply)
  assert.equal((await pool.balanceOf(admin)).toString(), initialSupply.toString())

  // Deploy Core
  await deployer.deploy(
    Core,
    reserves.map(r => r.address),
    aTokens.map(r => r.address),
    pool.address,
    oracle.address
  );
  const core = await Core.deployed()
  await pool.setController(core.address)

  // Deploy Aave
  await deployer.deploy(
    AavePlugin,
    reserves.map(r => r.address),
    aTokens.map(r => r.address),
    lendingPool.address,
    lendingPool.address, // _aaveLendingPoolCore but it is irrelevant here
    core.address,
    pool.address
  )

  // Deploy Uniswap
  await deployer.deploy(MockUniswap)
  await deployer.deploy(
    UniswapPlugin,
    MockUniswap.address,
    AavePlugin.address,
    pool.address
  )
};
