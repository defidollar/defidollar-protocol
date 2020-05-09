pragma solidity ^0.5.12;

import { IAToken } from "./IAToken.sol";
import { ILendingPool } from "./ILendingPool.sol";

import "../../Pool.sol";
import "../../Core.sol";

contract AavePlugin {
  Core public core;
  Pool public pool;
  uint8 public numReserves;
  mapping(address => address) public reserveToAtoken;
  ILendingPool public aaveLendingPool;

  uint public constant UINT_MAX_VALUE = uint256(-1);

  constructor(
    address[] memory _reserves,
    address[] memory _aTokens,
    address _aaveLendingPool,
    address _aaveLendingPoolCore,
    Core _core,
    Pool _pool
  ) public {
    core = _core;
    pool = _pool;
    numReserves = uint8(_reserves.length);
    aaveLendingPool = ILendingPool(_aaveLendingPool);
    // These allowances might eventually run out, so need a function to be able to refresh allowances
    for (uint8 i = 0; i < numReserves; i++) {
      reserveToAtoken[_reserves[i]] = _aTokens[i];
      require(
        IERC20(_reserves[i]).approve(_aaveLendingPoolCore, UINT_MAX_VALUE),
        "Reserve coin approval failed"
      );
      require(
        IERC20(_aTokens[i]).approve(address(_pool), UINT_MAX_VALUE),
        "AToken coin approval failed"
      );
      require(
        IERC20(address(_pool)).approve(address(_pool), UINT_MAX_VALUE),
        "Pool coin approval failed"
      );
    }
  }

  function mintExactIn(address tokenIn, uint256 tokenAmountIn, uint minPoolAmountOut)
    external
    returns(uint poolAmountOut)
  {
    _pull(tokenIn, msg.sender, address(this), tokenAmountIn);
    _depositToAave(tokenIn, tokenAmountIn);
    address aTokenIn = reserveToAtoken[tokenIn];
    poolAmountOut = pool.joinswapExternAmountIn(aTokenIn, tokenAmountIn);
    require(
      poolAmountOut >= minPoolAmountOut,
      "ERR_MIN_POOL_OUT"
    );
    _push(address(pool), msg.sender, poolAmountOut);
  }

  function mintExactOut(uint poolAmountOut, address tokenIn, uint maxTokenAmountIn)
    external
    returns(uint tokenAmountIn)
  {
    address aTokenIn = reserveToAtoken[tokenIn];
    tokenAmountIn = pool.calcSingleInGivenPoolOut(poolAmountOut, aTokenIn);
    require(
      tokenAmountIn <= maxTokenAmountIn,
      "ERR_MAX_TOKEN_IN"
    );
    _pull(tokenIn, msg.sender, address(this), tokenAmountIn);
    _depositToAave(tokenIn, tokenAmountIn);
    pool.joinswapPoolAmountOut(poolAmountOut, aTokenIn);
    _push(address(pool), msg.sender, poolAmountOut);
  }

  function redeemExact(uint poolAmountIn, address tokenOut, uint minTokenAmountOut)
    external
    returns(uint tokenAmountOut)
  {
    _pull(address(pool), msg.sender, address(this), poolAmountIn);
    address aTokenOut = reserveToAtoken[tokenOut];
    tokenAmountOut = pool.exitswapPoolAmountIn(poolAmountIn, aTokenOut);
    require(
      tokenAmountOut >= minTokenAmountOut,
      "ERR_MIN_TOKEN_OUT"
    );
    _withdrawFromAave(aTokenOut, tokenAmountOut);
    _push(tokenOut, msg.sender, tokenAmountOut);
  }

  function redeemExactOut(address tokenOut, uint tokenAmountOut, uint maxPoolAmountIn)
    external
    returns(uint poolAmountIn)
  {
    address aTokenOut = reserveToAtoken[tokenOut];
    poolAmountIn = pool.calcPoolInGivenSingleOut(aTokenOut, tokenAmountOut);
    require(
      poolAmountIn <= maxPoolAmountIn,
      "ERR_MAX_POOL_IN"
    );
    _pull(address(pool), msg.sender, address(this), poolAmountIn);
    pool.exitswapExternAmountOut(aTokenOut, tokenAmountOut);
    _withdrawFromAave(aTokenOut, tokenAmountOut);
    _push(tokenOut, msg.sender, tokenAmountOut);
  }

  /**
  * @dev Deposit assets to aave
  * @param reserve The actual erc20 token address
  */
  function _depositToAave(address reserve, uint256 quantity) internal {
    aaveLendingPool.deposit(reserve, quantity, 0); // _referralCode
  }

  function _withdrawFromAave(address aToken, uint256 quantity) internal {
    IAToken(aToken).redeem(quantity);
  }

  function _pull(address _token, address from, address to, uint amount) internal {
    require(
      IERC20(_token).transferFrom(from, to, amount),
      "ERR_ERC20_PULL"
    );
  }

  function _push(address _token, address to, uint amount) internal {
    require(
      IERC20(_token).transfer(to, amount),
      "ERR_ERC20_PUSH"
    );
  }
}
