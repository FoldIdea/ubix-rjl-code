/**
 * BlackjackController
 *
 * @description :: Server-side logic for managing Blackjacks
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
	game: function(req, res) {
    res.view(null);
  },

  gamedata: function(req, res) {
    var decks = req.param('decks') || 1;
    var players = req.param('players') || 1;
    var opts = {}
    opts.soft17stay = req.param('soft17stay');
    var deck = CardDeck.deck(decks);
    deck = CardDeck.shuffle(deck);
    var table = Blackjack.openingDeal(deck, players, opts);
    res.json(table);
  },

  hitme: function(req, res) {
    var table = req.param('table');
    var player = req.param('player') || 0;
    table = Blackjack.hitPlayer(player, table);
    res.json(table);
  },

  dealout: function(req, res) {
    var table = req.param('table');
    table = Blackjack.dealOut(table);
    res.json(table);
  }
};

