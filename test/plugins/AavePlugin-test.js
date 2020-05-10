const utils = require('../../utils/utils')

const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
const toBN =web3.utils.toBN;
const MAX = web3.utils.toTwosComplement(-1);

contract("AavePlugin", accounts => {
  const admin = accounts[0]
  let _artifacts

  before(async function() {
    _artifacts = await utils.getArtifacts(artifacts)
  })


  it('mintExactIn', async function() {
    const reserve = _artifacts.reserves[0]
    const initialBalance = await _artifacts.pool.balanceOf(admin)

    const tokenAmountIn = toWei('20')
    await reserve.mint(admin, tokenAmountIn)
    await reserve.approve(_artifacts.aave.address, tokenAmountIn)

    const poolAmountOut = await _artifacts.aave.mintExactIn.call(reserve.address, tokenAmountIn, 0)
    await _artifacts.aave.mintExactIn(reserve.address, tokenAmountIn, 0)

    const finalBalance = await _artifacts.pool.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.add(poolAmountOut).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })

  it('mintExactOut', async function() {
    const reserve = _artifacts.reserves[1]
    const poolAmountOut = toBN(toWei('10'))

    // maxAmountIn is a little greater than what poolAmountOut pool tokens will be worth
    const maxAmountIn = toWei('15')
    await reserve.mint(admin, maxAmountIn)
    await reserve.approve(_artifacts.aave.address, maxAmountIn)
    const initialBalance = await _artifacts.pool.balanceOf(admin)

    const initialReserveBalance = await reserve.balanceOf(admin)
    const tokenAmountIn = await _artifacts.aave.mintExactOut.call(poolAmountOut, reserve.address, maxAmountIn)
    await _artifacts.aave.mintExactOut(poolAmountOut, reserve.address, maxAmountIn)

    const finalBalance = await _artifacts.pool.balanceOf(admin)
    const finalReserveBalance = await reserve.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.add(poolAmountOut).toString())
    assert.equal(finalReserveBalance.toString(), initialReserveBalance.sub(tokenAmountIn).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })

  it('redeemExact', async function() {
    const reserve = _artifacts.reserves[0]
    const poolAmountIn = toBN(toWei('5'))
    await _artifacts.pool.approve(_artifacts.aave.address, poolAmountIn)
    const initialBalance = await _artifacts.pool.balanceOf(admin)
    const initialReserveBalance = await reserve.balanceOf(admin)
    const tokenAmountOut = await _artifacts.aave.redeemExact.call(poolAmountIn, reserve.address, 0)
    await _artifacts.aave.redeemExact(poolAmountIn, reserve.address, 0)
    const finalBalance = await _artifacts.pool.balanceOf(admin)
    const finalReserveBalance = await reserve.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.sub(poolAmountIn).toString())
    assert.equal(finalReserveBalance.toString(), initialReserveBalance.add(tokenAmountOut).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })

  it('redeemExactOut', async function() {
    const reserve = _artifacts.reserves[1]
    // console.log((await _artifacts.aTokens[1].balanceOf(await _artifacts.pool._bPool())).toString()) // debug
    const tokenAmountOut = toBN(toWei('3'))
    const maxPoolAmountIn = toBN(toWei('15'))
    await _artifacts.pool.approve(_artifacts.aave.address, maxPoolAmountIn)
    const initialBalance = await _artifacts.pool.balanceOf(admin)
    const initialReserveBalance = await reserve.balanceOf(admin)
    const poolAmountIn = await _artifacts.aave.redeemExactOut.call(reserve.address, tokenAmountOut, maxPoolAmountIn)

    await _artifacts.aave.redeemExactOut(reserve.address, tokenAmountOut, MAX)
    const finalBalance = await _artifacts.pool.balanceOf(admin)
    const finalReserveBalance = await reserve.balanceOf(admin)
    assert.equal(finalBalance.toString(), initialBalance.sub(poolAmountIn).toString())
    assert.equal(finalReserveBalance.toString(), initialReserveBalance.add(tokenAmountOut).toString())
    console.log({initialBalance: fromWei(initialBalance), finalBalance: fromWei(finalBalance)})
  })
})
