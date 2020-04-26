const TMath = artifacts.require('TMath');
const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');

module.exports = async function (deployer, network, accounts) {
    if (network === 'development' || network === 'coverage') {
        deployer.deploy(TMath);
    }
    deployer.deploy(BFactory);
    deployer.deploy(BPool);
};
