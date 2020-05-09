pragma solidity ^0.5.12;

contract ILendingPool {
  function deposit(address _reserve, uint256 _amount, uint16 _referralCode) public;
}
