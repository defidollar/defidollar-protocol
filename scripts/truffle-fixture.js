const DefiDollarCore = artifacts.require("DefiDollarCore");
const DefiDollarToken = artifacts.require("DefiDollarToken");
const LendingPool = artifacts.require("MockLendingPool");
const aToken = artifacts.require("MockIAToken");

const Reserve = artifacts.require("Reserve");

const BFactory = artifacts.require('BFactory');
const NUM_RESERVES = 2;

async function deployBalancer() {
  const bFactory = await BFactory.new()
  BFactory.setAsDeployed(bFactory)
}

async function deployDefiDollar(accounts) {
  const admin = accounts[0]
  const reserves = []
  const aTokens = []
  for (let i = 0; i < NUM_RESERVES; i++) {
    reserves.push(await Reserve.new())
  }
  const lendingPool = await LendingPool.new(reserves.map(r => r.address))
  for (let i = 0; i < NUM_RESERVES; i++) {
    aTokens.push(await aToken.at(await lendingPool.rToA(reserves[i].address)))
  }
  const core = await DefiDollarCore.new(
    reserves.map(r => r.address),
    aTokens.map(r => r.address),
    lendingPool.address,
    lendingPool.address // core, doesn't matter for mocks
  );
  const defiDollarToken = await DefiDollarToken.new(core.address)
  const bFactory = await BFactory.deployed()

  // mint reserve coins
  const amount = web3.utils.toWei('100')
  const balances = []
  const denorm = []
  for (let i = 0; i < NUM_RESERVES; i++) {
    await reserves[i].mint(admin, amount)
    await reserves[i].approve(core.address, amount)
    balances.push(amount)
    denorm.push(web3.utils.toWei('25')) // Required %age share / 2
  }
  await core.initialize(
    defiDollarToken.address,
    bFactory.address,
    balances,
    denorm
  )
  DefiDollarCore.setAsDeployed(core)
};

module.exports = async function (accounts) {
  await deployBalancer()
  await deployDefiDollar(accounts)
}
