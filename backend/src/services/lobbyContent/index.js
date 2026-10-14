const lobbyContent = require('./lobbyContent.service');
const popularGames = require('./popularGames.service');

module.exports = {
  ...lobbyContent,
  ...popularGames,
};
