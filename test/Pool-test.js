const utils = require('../utils/utils')

const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
const toBN =web3.utils.toBN;
const MAX = web3.utils.toTwosComplement(-1);

contract("Pool", accounts => {
  const admin = accounts[0]
  const user1 = accounts[1]
  let _artifacts

  before(async function() {
    _artifacts = await utils.getArtifacts(artifacts)
  })

  it('swapExactAmountOut', async function() {
    const tokenIn = _artifacts.aTokens[0]
    const tokenOut = _artifacts.aTokens[1]
    const tokenAmountOut = toBN(toWei('3.6'))
    const maxAmountIn = toWei('20')
    await tokenIn.mint(user1, maxAmountIn, { from: admin })
    await tokenIn.approve(_artifacts.bpool.address, MAX, { from: user1 })
    const iUserBalanceTokenIn = await tokenIn.balanceOf(user1)
    const iPoolBalanceTokenIn = await tokenIn.balanceOf(_artifacts.bpool.address)
    const iUserBalanceTokenOut = await tokenOut.balanceOf(user1)
    const iPoolBalanceTokenOut = await tokenOut.balanceOf(_artifacts.bpool.address)
    const { tokenAmountIn, spotPriceAfter } = await _artifacts.bpool.swapExactAmountOut.call(
      tokenIn.address, maxAmountIn, tokenOut.address, tokenAmountOut, MAX, { from: user1 })
    await _artifacts.bpool.swapExactAmountOut(tokenIn.address, maxAmountIn, tokenOut.address, tokenAmountOut, MAX, { from: user1 })

    assert.equal((await tokenIn.balanceOf(user1)).toString(), iUserBalanceTokenIn.sub(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(user1)).toString(), iUserBalanceTokenOut.add(tokenAmountOut).toString())
    assert.equal((await tokenIn.balanceOf(_artifacts.bpool.address)).toString(), iPoolBalanceTokenIn.add(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(_artifacts.bpool.address)).toString(), iPoolBalanceTokenOut.sub(tokenAmountOut).toString())
  })

  it('swapExactAmountIn', async function() {
    const tokenIn = _artifacts.aTokens[0]
    const tokenOut = _artifacts.aTokens[1]
    const tokenAmountIn = toBN(toWei('10.987'))
    await tokenIn.mint(user1, tokenAmountIn, { from: admin })
    const iUserBalanceTokenIn = await tokenIn.balanceOf(user1)
    const iPoolBalanceTokenIn = await tokenIn.balanceOf(_artifacts.bpool.address)
    const iUserBalanceTokenOut = await tokenOut.balanceOf(user1)
    const iPoolBalanceTokenOut = await tokenOut.balanceOf(_artifacts.bpool.address)
    const { tokenAmountOut, spotPriceAfter } = await _artifacts.bpool.swapExactAmountIn.call(
      tokenIn.address, tokenAmountIn, tokenOut.address, 0, MAX, { from: user1 })
    await _artifacts.bpool.swapExactAmountIn(tokenIn.address, tokenAmountIn, tokenOut.address, 0, MAX, { from: user1 })

    assert.equal((await tokenIn.balanceOf(user1)).toString(), iUserBalanceTokenIn.sub(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(user1)).toString(), iUserBalanceTokenOut.add(tokenAmountOut).toString())
    assert.equal((await tokenIn.balanceOf(_artifacts.bpool.address)).toString(), iPoolBalanceTokenIn.add(tokenAmountIn).toString())
    assert.equal((await tokenOut.balanceOf(_artifacts.bpool.address)).toString(), iPoolBalanceTokenOut.sub(tokenAmountOut).toString())
  })
})
