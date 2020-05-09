const Pool = artifacts.require('Pool');
const BFactory = artifacts.require('BFactory');

const Core = artifacts.require("Core");
const AavePlugin = artifacts.require("AavePlugin");
const Reserve = artifacts.require("Reserve");
const MockIAToken = artifacts.require("MockIAToken");
const MockLendingPool = artifacts.require("MockLendingPool");
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
const toBN =web3.utils.toBN;
const MAX = web3.utils.toTwosComplement(-1);

contract("AavePlugin", accounts => {
  const admin = accounts[0]
  const user1 = accounts[1]

  before(async function() {
    this.core = await Core.deployed()
    this.pool = await Pool.at(await this.core.pool())
    this.aave = await AavePlugin.deployed()
    this.lendingPool = await MockLendingPool.at(await this.aave.aaveLendingPool())
    this.numReserves = await this.aave.numReserves()
    this.reserves = []
    this.aTokens = []
    for (let i = 0; i < this.numReserves; i++) {
      this.reserves.push(await Reserve.at(await this.core.reserves(i)))
      this.aTokens.push(await MockIAToken.at(await this.lendingPool.rToA(this.reserves[i].address)))
      assert.equal(await this.aave.reserveToAtoken(this.reserves[i].address), this.aTokens[i].address)
    }
  })

  it('mintExactIn', async function() {
    const reserve = this.reserves[0]
    const initialBalance = await this.pool.balanceOf(admin)

    const tokenAmountIn = toWei('20')
    await reserve.mint(admin, tokenAmountIn)
    await reserve.approve(this.aave.address, tokenAmountIn)

    const poolAmountOut = await this.aave.mintExactIn.call(reserve.address, tokenAmountIn, 0)
    await this.aave.mintExactIn(reserve.address, tokenAmountIn, 0)

    const finalBalance = await this.pool.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.add(poolAmountOut).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })

  it('mintExactOut', async function() {
    const reserve = this.reserves[1]
    const poolAmountOut = toBN(toWei('10'))

    // maxAmountIn is a little greater than what poolAmountOut pool tokens will be worth
    const maxAmountIn = toWei('15')
    await reserve.mint(admin, maxAmountIn)
    await reserve.approve(this.aave.address, maxAmountIn)
    const initialBalance = await this.pool.balanceOf(admin)

    const initialReserveBalance = await reserve.balanceOf(admin)
    const tokenAmountIn = await this.aave.mintExactOut.call(poolAmountOut, reserve.address, maxAmountIn)
    await this.aave.mintExactOut(poolAmountOut, reserve.address, maxAmountIn)

    const finalBalance = await this.pool.balanceOf(admin)
    const finalReserveBalance = await reserve.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.add(poolAmountOut).toString())
    assert.equal(finalReserveBalance.toString(), initialReserveBalance.sub(tokenAmountIn).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })

  it('redeemExact', async function() {
    const reserve = this.reserves[0]
    const poolAmountIn = toBN(toWei('5'))
    await this.pool.approve(this.aave.address, poolAmountIn)
    const initialBalance = await this.pool.balanceOf(admin)
    const initialReserveBalance = await reserve.balanceOf(admin)
    const tokenAmountOut = await this.aave.redeemExact.call(poolAmountIn, reserve.address, 0)
    await this.aave.redeemExact(poolAmountIn, reserve.address, 0)
    const finalBalance = await this.pool.balanceOf(admin)
    const finalReserveBalance = await reserve.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.sub(poolAmountIn).toString())
    assert.equal(finalReserveBalance.toString(), initialReserveBalance.add(tokenAmountOut).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })

  it('redeemExactOut', async function() {
    const reserve = this.reserves[1]
    // console.log((await this.aTokens[1].balanceOf(await this.pool._bPool())).toString()) // debug
    const tokenAmountOut = toBN(toWei('3'))
    const maxPoolAmountIn = toBN(toWei('15'))
    await this.pool.approve(this.aave.address, maxPoolAmountIn)
    const initialBalance = await this.pool.balanceOf(admin)
    const initialReserveBalance = await reserve.balanceOf(admin)
    const poolAmountIn = await this.aave.redeemExactOut.call(reserve.address, tokenAmountOut, maxPoolAmountIn)

    await this.aave.redeemExactOut(reserve.address, tokenAmountOut, MAX)
    const finalBalance = await this.pool.balanceOf(admin)
    const finalReserveBalance = await reserve.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.sub(poolAmountIn).toString())
    assert.equal(finalReserveBalance.toString(), initialReserveBalance.add(tokenAmountOut).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })
})
