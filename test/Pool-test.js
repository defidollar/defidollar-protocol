const Pool = artifacts.require('Pool');
const BPool = artifacts.require('BPool');
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

contract("Pool", accounts => {
  const admin = accounts[0]
  const user1 = accounts[1]

  before(async function() {
    this.core = await Core.deployed()
    this.pool = await Pool.at(await this.core.pool())
    this.bpool = await BPool.at(await this.pool._bPool())
    this.numReserves = await this.core.numReserves()
    this.reserves = []
    this.aTokens = []
    for (let i = 0; i < this.numReserves; i++) {
      this.reserves.push(await Reserve.at(await this.core.reserves(i)))
      this.aTokens.push(await MockIAToken.at(await this.core.aTokens(i)))
    }
  })

  it('swapExactAmountOut', async function() {
    const tokenIn = this.aTokens[0]
    const tokenOut = this.aTokens[1]
    const tokenAmountOut = toBN(toWei('3.6'))
    const maxAmountIn = toWei('20')
    await tokenIn.mint(user1, maxAmountIn, { from: admin })
    await tokenIn.approve(this.bpool.address, MAX, { from: user1 })
    const iUserBalanceTokenIn = await tokenIn.balanceOf(user1)
    const iPoolBalanceTokenIn = await tokenIn.balanceOf(this.bpool.address)
    const iUserBalanceTokenOut = await tokenOut.balanceOf(user1)
    const iPoolBalanceTokenOut = await tokenOut.balanceOf(this.bpool.address)
    const { tokenAmountIn, spotPriceAfter } = await this.bpool.swapExactAmountOut.call(
      tokenIn.address, maxAmountIn, tokenOut.address, tokenAmountOut, MAX, { from: user1 })
    await this.bpool.swapExactAmountOut(tokenIn.address, maxAmountIn, tokenOut.address, tokenAmountOut, MAX, { from: user1 })

    assert.equal((await tokenIn.balanceOf(user1)).toString(), iUserBalanceTokenIn.sub(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(user1)).toString(), iUserBalanceTokenOut.add(tokenAmountOut).toString())
    assert.equal((await tokenIn.balanceOf(this.bpool.address)).toString(), iPoolBalanceTokenIn.add(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(this.bpool.address)).toString(), iPoolBalanceTokenOut.sub(tokenAmountOut).toString())
  })

  it('swapExactAmountIn', async function() {
    const tokenIn = this.aTokens[0]
    const tokenOut = this.aTokens[1]
    const tokenAmountIn = toBN(toWei('10.987'))
    await tokenIn.mint(user1, tokenAmountIn, { from: admin })
    const iUserBalanceTokenIn = await tokenIn.balanceOf(user1)
    const iPoolBalanceTokenIn = await tokenIn.balanceOf(this.bpool.address)
    const iUserBalanceTokenOut = await tokenOut.balanceOf(user1)
    const iPoolBalanceTokenOut = await tokenOut.balanceOf(this.bpool.address)
    const { tokenAmountOut, spotPriceAfter } = await this.bpool.swapExactAmountIn.call(
      tokenIn.address, tokenAmountIn, tokenOut.address, 0, MAX, { from: user1 })
    await this.bpool.swapExactAmountIn(tokenIn.address, tokenAmountIn, tokenOut.address, 0, MAX, { from: user1 })

    assert.equal((await tokenIn.balanceOf(user1)).toString(), iUserBalanceTokenIn.sub(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(user1)).toString(), iUserBalanceTokenOut.add(tokenAmountOut).toString())
    assert.equal((await tokenIn.balanceOf(this.bpool.address)).toString(), iPoolBalanceTokenIn.add(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(this.bpool.address)).toString(), iPoolBalanceTokenOut.sub(tokenAmountOut).toString())
  })
})
