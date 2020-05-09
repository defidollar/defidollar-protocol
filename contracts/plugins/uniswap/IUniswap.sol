pragma solidity ^0.5.12;

contract IUniswap {
  /**
  * Receive an exact amount of output tokens for as few input tokens as possible, along the route determined by the path.
  * The first element of path is the input token, the last is the output token, and any intermediate elements represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
  */
  function swapTokensForExactTokens(
    uint amountOut,
    uint amountInMax,
    address[] calldata path,
    address to,
    uint deadline
  ) external returns (uint[] memory amounts);

  /**
  * Swaps an exact amount of input tokens for as many output tokens as possible, along the route determined by the path.
  * The first element of path is the input token, the last is the output token, and any intermediate elements represent intermediate pairs to trade through (if, for example, a direct pair does not exist).
  */
  function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
  ) external returns (uint[] memory amounts);
}
