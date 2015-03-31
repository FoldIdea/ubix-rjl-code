module.exports = {
  SUITS: [ 'Hearts', 'Clubs', 'Diamonds', 'Spades' ],
  SUITCARDS: [ 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King' ],
  CARDVALUES: [ [1,11], 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10 ],

  deck: function(numdecks) {
    if (numdecks == null) numdecks = 1;
    var cards = [];
    // probably an underscore method to populate this faster, but brute force it for now
    for (var deck = 0; deck < numdecks; deck++) {
      for (var suit = 0; suit < CardDeck.SUITS.length; suit++) {
        for (var card = 0; card < CardDeck.SUITCARDS.length; card++) {
          cards.push({suit: CardDeck.SUITS[suit], card: CardDeck.SUITCARDS[card], value: CardDeck.CARDVALUES[card]});
        }
      }
    }
    return cards;
  },

  shuffle: function(deck) {
    // oh underscore, what can't you do?
    deck = _.shuffle(deck);
    return deck;
  }
}
