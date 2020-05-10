```
INITIAL_AMOUNT=500000 truffle migrate --reset && truffle exec scripts/simulate.js
```
```
{ deviations:
   { dusd: 0.15343069657807362,
     'usd-coin': 0.20624925883791878,
     tether: 0.214674516952999 },
  profit: 355.64762907111043 }

{ deviations:
   { dusd: 0.2550739324790262,
     'usd-coin': 0.20624925883791878,
     'true-usd': 0.33654444004026673 },
  profit: 1259.6890281457277 }

{ deviations:
   { dusd: 0.6978653457506134,
     dai: 1.3879218964838727,
     'usd-coin': 0.20624925883791878 },
  profit: 1098.8219693643719 }
```

```
INITIAL_AMOUNT=50000 truffle migrate --reset && truffle exec scripts/simulate.js
```
```
{ deviations:
   { dusd: 0, dai: 1.3879218964838727, nusd: 2.962608757300444 },
  profit: 2033.237658171714,
  mp1: 51539.28556499885,
  mp2: 59770.47750485338 }
```
