const DefiDollarCore = artifacts.require("DefiDollarCore");
const DefiDollarToken = artifacts.require("DefiDollarToken");
const LendingPool = artifacts.require("MockLendingPool");
const aToken = artifacts.require("MockIAToken");

const Reserve = artifacts.require("Reserve");

const NUM_RESERVES = 2;

module.exports = async function (deployer, network, accounts) {
  const reserves = []
  const aTokens = []
  for (let i = 0; i < NUM_RESERVES; i++) {
    reserves.push(await Reserve.new())
  }
  const lendingPool = await LendingPool.new(reserves.map(r => r.address))
  for (let i = 0; i < NUM_RESERVES; i++) {
    aTokens.push(await aToken.at(await lendingPool.rToA(reserves[i].address)))
  }

  await deployer.deploy(DefiDollarCore,
    reserves.map(r => r.address),
    aTokens.map(r => r.address),
    lendingPool.address,
    lendingPool.address // core, doesn't matter for mocks
  );
  const core = await DefiDollarCore.deployed()
  await deployer.deploy(DefiDollarToken, core.address)
};
