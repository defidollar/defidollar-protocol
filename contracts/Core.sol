pragma solidity ^0.5.12;

import { IAToken } from "./plugins/aave/IAToken.sol";
import { Oracle } from "./chainlink/Oracle.sol";
import "./Pool.sol";
import "./balancer/smart-pools/IBFactory.sol";

contract Core {
  address[] public reserves;
  IAToken[] public aTokens;
  uint public numReserves;
  Pool public pool;
  IBPool public bpool;
  Oracle public oracle;

  uint public constant UINT_MAX_VALUE = uint256(-1);

  constructor(
    address[] memory _reserves,
    IAToken[] memory _aTokens,
    address _pool,
    address _oracle
  ) public {
    reserves = _reserves;
    aTokens = _aTokens;
    numReserves = _aTokens.length;
    pool = Pool(_pool);
    bpool = IBPool(pool._bPool());
    oracle = Oracle(_oracle);
  }

  function reBalance() public {
    int256[] memory feed = oracle.getPriceFeed();
    uint supply = pool.totalSupply();
    for(uint8 i = 0; i < numReserves; i++) {
      IAToken aToken = aTokens[i];
      (uint norm, uint poolBalance, uint denorm) = _poolMetadata(address(aToken));
      uint marketCap = supply * norm;
      uint newBalance = marketCap / uint(feed[i]);
      if (newBalance == poolBalance) {
        continue;
      }
      uint coreBalance = aToken.balanceOf(address(this));
      if (newBalance > poolBalance + coreBalance) {
        // can't give more than what the core has accumulated in earnings
        newBalance = poolBalance + coreBalance;
      } else if (newBalance < 10**6) {
        // balancer pool requires a MIN_BALANCE = 10**6
        newBalance = 10**6;
      }
      if (newBalance > poolBalance) {
        require(
          aToken.transfer(address(pool), newBalance - poolBalance),
          "ERR_ERC20_TRANSFER"
        );
      }
      pool.rebind(address(aToken), newBalance, denorm);
    }
  }

  function _poolMetadata(address _token) internal view returns(uint norm, uint balance, uint denorm) {
    norm = bpool.getNormalizedWeight(_token);
    balance = bpool.getBalance(_token);
    denorm = bpool.getDenormalizedWeight(_token);
  }
}
