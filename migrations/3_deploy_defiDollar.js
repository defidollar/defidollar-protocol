const Core = artifacts.require("Core");
const DefiDollarToken = artifacts.require("DefiDollarToken");
const LendingPool = artifacts.require("MockLendingPool");
const aToken = artifacts.require("MockIAToken");
const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');
const Reserve = artifacts.require("Reserve");
const Oracle = artifacts.require("Oracle");
const Aggregator = artifacts.require("MockAggregator");

const NUM_RESERVES = parseInt(process.env.NUM_RESERVES) || 2;

module.exports = async function (deployer, network, accounts) {
  const reserves = []
  const aTokens = []
  for (let i = 0; i < NUM_RESERVES; i++) {
    reserves.push(await Reserve.new())
  }

  const aggregators = []
  const lendingPool = await LendingPool.new(reserves.map(r => r.address))
  for (let i = 0; i < NUM_RESERVES; i++) {
    aTokens.push(await aToken.at(await lendingPool.rToA(reserves[i].address)))
    aggregators.push(await Aggregator.new())
  }

  await deployer.deploy(Oracle, aggregators.map(a => a.address))
  const oracle = await Oracle.deployed()

  await deployer.deploy(Core,
    reserves.map(r => r.address),
    aTokens.map(r => r.address),
    lendingPool.address,
    lendingPool.address, // lendingPoolCore actually, but doesn't matter for mocks
    oracle.address
  );
  const core = await Core.deployed()
  await deployer.deploy(DefiDollarToken, core.address)
  const defiDollarToken = await DefiDollarToken.deployed()

  // initialize core
  const amount = web3.utils.toWei(process.env.INITIAL_AMOUNT || '50') // of each
  const admin = accounts[0]
  const balances = []
  const denorm = []
  for (let i = 0; i < NUM_RESERVES; i++) {
    await reserves[i].mint(admin, amount)
    await reserves[i].approve(core.address, amount)
    balances.push(amount)
    denorm.push(web3.utils.toWei('10')) // giving equal weight to each coin
  }
  const bFactory = await BFactory.deployed()
  await core.initialize(
    defiDollarToken.address,
    bFactory.address,
    balances,
    denorm
  )
};
