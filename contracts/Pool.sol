pragma solidity ^0.5.12;

// import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./balancer/smart-pools/LiquidityBootstrappingPool.sol";

contract Pool is LiquidityBootstrappingPool {
  modifier _onlyController_() {
    require(
      msg.sender == _controller,
      "ONLY_CONTROLLER"
    );
    _;
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
    uint bal = IERC20(token).balanceOf(address(this));
    // send any residue tokens to core
    _pushUnderlying(token, _controller, bal);
  }
}
