pragma solidity ^0.5.12;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ILendingPool } from "../aave/ILendingPool.sol";
import { MockIAToken } from "./MockIAToken.sol";

contract MockLendingPool is ILendingPool {
  mapping(address => address) public rToA;

  constructor(address[] memory _reserves) public {
    for (uint i = 0; i < _reserves.length; i++) {
      rToA[_reserves[i]] = address(new MockIAToken(_reserves[i]));
    }
  }

  function deposit(address _reserve, uint256 _amount, uint16 /* _referralCode */) public {
    require(
      IERC20(_reserve).transferFrom(msg.sender, address(this), _amount),
      "ERR_ERC20_TRANSFER"
    );
    MockIAToken(rToA[_reserve]).mint(msg.sender, _amount);
  }

  function redeemUnderlying(
    address _reserve,
    address payable _user,
    uint256 _amount
  ) public {
    require(
      IERC20(_reserve).transfer(_user, _amount),
      "ERR_ERC20_TRANSFER"
    );
  }
}
