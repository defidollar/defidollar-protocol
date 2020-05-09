pragma solidity ^0.5.12;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IAToken is IERC20 {
  function redeem(uint256 _amount) external;
  // function redirectInterestStream(address _to) external;
}
