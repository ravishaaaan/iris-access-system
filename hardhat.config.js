require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28", // Make sure this matches the version in your contract roughly
  networks: {
    amoy: {
      url: process.env.POLYGON_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80002 // This is the ID for Polygon Amoy
    },
  },
};