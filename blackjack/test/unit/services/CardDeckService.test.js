describe('CardDeckService', function() {
  describe('#deck', function() {
    it('should return a single standard ordered deck', function(done) {
      var d = CardDeck.deck();
      d.length.should.be.eql(52);
      d[10].suit.should.be.eql('Hearts');
      d[10].card.should.be.eql('Jack');
      d[11].card.should.be.eql('Queen');
      d[13].suit.should.be.eql('Clubs');
      d[13].card.should.be.eql('Ace');
      done();
    })
    it('should return a triple standard ordered deck', function(done) {
      var d = CardDeck.deck(3);
      d.length.should.be.eql(52*3);
      d[10].suit.should.be.eql('Hearts');
      d[10].card.should.be.eql('Jack');
      d[62].suit.should.be.eql('Hearts');
      d[62].card.should.be.eql('Jack');
      d[114].suit.should.be.eql('Hearts');
      d[114].card.should.be.eql('Jack');
      done();
    })
  })
  describe('#shuffle', function() {
    it('should shuffle a single deck', function(done) {
      var d = CardDeck.deck();
      d = CardDeck.shuffle(d);
      d.length.should.be.eql(52);
      var inorderCount = 0;
      var uniqueCards = {};
      for (var c = 0; c < d.length; c++) {
        var card = d[c];
        if (card.suit == CardDeck.SUITS[(c / 13) % 4] && card.card == CardDeck.SUITCARDS[c % 13]) inorderCount += 1;
        uniqueCards[card.suit + '.' + card.card] = (uniqueCards[card.suit + '.' + card.card] || 0) + 1;
      }
      inorderCount.should.not.be.eql(52);
      _.keys(uniqueCards).length.should.be.eql(52);
      _.min(_.values(uniqueCards)).should.be.eql(1);
      _.max(_.values(uniqueCards)).should.be.eql(1);
      done();
    })
    it('should shuffle a triple deck', function(done) {
      var d = CardDeck.deck(3);
      d = CardDeck.shuffle(d);
      d.length.should.be.eql(52*3);
      var inorderCount = 0;
      var uniqueCards = {};
      for (var c = 0; c < d.length; c++) {
        var card = d[c];
        if (card.suit == CardDeck.SUITS[(c / 13) % 4] && card.card == CardDeck.SUITCARDS[c % 13]) inorderCount += 1;
        uniqueCards[card.suit + '.' + card.card] = (uniqueCards[card.suit + '.' + card.card] || 0) + 1;
      }
      inorderCount.should.not.be.eql(52*3);
      _.keys(uniqueCards).length.should.be.eql(52);
      _.min(_.values(uniqueCards)).should.be.eql(3);
      _.max(_.values(uniqueCards)).should.be.eql(3);
      done();
    })
  })
})

