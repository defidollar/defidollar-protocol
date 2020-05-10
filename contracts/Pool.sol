pragma solidity ^0.5.12;

import "./balancer/smart-pools/LiquidityBootstrappingPool.sol";

contract Pool is LiquidityBootstrappingPool {
  uint public constant MIN_FEE = 10**12;

  modifier _onlyController_() {
    require(
      msg.sender == _controller,
      "ONLY_CONTROLLER"
    );
    _;
  }

  constructor(
    address factoryAddress,
    address[] memory tokens,
    uint256[] memory startBalances,
    uint256[] memory startWeights,
    uint256[] memory endWeights
  )
    public
    LiquidityBootstrappingPool(
      factoryAddress,
      tokens,
      startBalances,
      startWeights,
      endWeights,
      [0, 0, MIN_FEE] // startBlock, endBlock, swapFee
    )
  {

  }

  function calcSingleInGivenPoolOut(uint poolAmountOut, address tokenIn)
    public view
    returns (uint /* tokenAmountIn */)
  {
    return _bPool.calcSingleInGivenPoolOut(
      _bPool.getBalance(tokenIn),
      _bPool.getDenormalizedWeight(tokenIn),
      _totalSupply,
      _bPool.getTotalDenormalizedWeight(),
      poolAmountOut,
      _swapFee
    );
  }

  function calcPoolInGivenSingleOut(address tokenOut, uint tokenAmountOut)
    public view
    returns (uint /* poolAmountIn */)
  {
    return _bPool.calcPoolInGivenSingleOut(
      _bPool.getBalance(tokenOut),
      _bPool.getDenormalizedWeight(tokenOut),
      _totalSupply,
      _bPool.getTotalDenormalizedWeight(),
      tokenAmountOut,
      _swapFee
    );
  }

  function rebind(address token, uint balance, uint denorm)
    public
    _onlyController_
  {
    _bPool.rebind(token, balance, denorm);
    IERC20 erc20 = IERC20(token);
    // send any residue tokens to core
    erc20.transfer(_controller, erc20.balanceOf(address(this)));
  }
}
