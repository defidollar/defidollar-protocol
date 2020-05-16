pragma solidity ^0.5.12;

import { ERC20Mintable } from "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";

import { IAToken } from "../plugins/aave/IAToken.sol";
import "./MockLendingPool.sol";

contract MockIAToken is IAToken, ERC20Mintable {
  address public reserve;
  address pool;
  mapping (address => address) private interestRedirectionAddresses;

  constructor(address _reserve) public {
    reserve = _reserve;
    pool = msg.sender;
  }

  function mint(address account, uint256 amount) public returns (bool) {
      _mint(account, amount);
      return true;
  }

  function redeem(uint256 _amount) external {
    _burn(msg.sender, _amount);
    MockLendingPool(pool).redeemUnderlying(reserve, msg.sender, _amount);
  }

  function _transfer(address sender, address recipient, uint256 amount) internal {
    require(
      amount > 0,
      "Transferred amount needs to be greater than zero"
    );
    super._transfer(sender, recipient, amount);
  }

  // function redirectInterestStream(address _to) external {
  //   interestRedirectionAddresses[msg.sender][_to];
  // }

  function allowInterestRedirectionTo(address _to) external {
    return;
  }

  function redirectInterestStreamOf(address _from, address _to) external {
    return;
  }
}
