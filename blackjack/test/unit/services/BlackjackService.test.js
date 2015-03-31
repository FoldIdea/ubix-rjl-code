describe('BlackjackService', function() {
  describe('#calcHandTotal', function() {
    it('should total a pair of deuces', function(done) {
      var deuce = { suit:'Hearts', card:'2', value:2 };
      var total = Blackjack.calcHandTotal(deuce);
      total.should.be.eql(2);
      total = Blackjack.calcHandTotal(deuce, total);
      total.should.be.eql(4);
      done();
    })
    it('should total a pair of jacks', function(done) {
      var jack = { suit:'Clubs', card:'Jack', value:10 };
      var total = Blackjack.calcHandTotal(jack);
      total.should.be.eql(10);
      total = Blackjack.calcHandTotal(jack, total);
      total.should.be.eql(20);
      done();
    })
    it('should total an ace and deuce', function(done) {
      var deuce = { suit:'Hearts', card:'2', value:2 };
      var total = Blackjack.calcHandTotal(deuce);
      var ace = { suit:'Spaces', card:'Ace', value:[1,11] };
      total = Blackjack.calcHandTotal(ace, total);
      Array.isArray(total).should.be.true;
      total.length.should.be.eql(2);
      total[0].should.be.eql(3);
      total[1].should.be.eql(13);
      done();
    })
    it('should total a deuce and an ace', function(done) {
      var ace = { suit:'Spaces', card:'Ace', value:[1,11] };
      var total = Blackjack.calcHandTotal(ace);
      Array.isArray(total).should.be.true;
      total.length.should.be.eql(2);
      total[0].should.be.eql(1);
      total[1].should.be.eql(11);
      var deuce = { suit:'Hearts', card:'2', value:2 };
      total = Blackjack.calcHandTotal(deuce, total);
      Array.isArray(total).should.be.true;
      total.length.should.be.eql(2);
      total[0].should.be.eql(3);
      total[1].should.be.eql(13);
      done();
    })
    it('should total two aces', function(done) {
      var ace = { suit:'Spaces', card:'Ace', value:[1,11] };
      var total = Blackjack.calcHandTotal(ace);
      total = Blackjack.calcHandTotal(ace, total);
      // all aces subsequent to the first are treated as 1
      Array.isArray(total).should.be.true;
      total.length.should.be.eql(2);
      total[0].should.be.eql(2);
      total[1].should.be.eql(12);
      done();
    })
  })
  describe('#openingDeal', function() {
    it('should do an opening deal for 1 deck and 1 player', function(done) {
      var d = CardDeck.deck();
      d = CardDeck.shuffle(d);
      var t = Blackjack.openingDeal(d, 1);
      t.shoe.length.should.be.eql(52 - 4); // two cards each for dealer and player
      t.dealerHand.cards.length.should.be.eql(2);
      t.dealerHand.visibleCards.length.should.be.eql(1);
      t.hands.length.should.be.eql(1);
      t.hands[0].cards.length.should.be.eql(2);
      t.hands[0].visibleCards.length.should.be.eql(2);
      done();
    })
    it('should do an opening deal for 3 decks and 7 players', function(done) {
      var d = CardDeck.deck(3);
      d = CardDeck.shuffle(d);
      var t = Blackjack.openingDeal(d, 7);
      t.shoe.length.should.be.eql(52*3 - 2*8); // two cards for each player and the dealer
      t.dealerHand.cards.length.should.be.eql(2);
      t.dealerHand.visibleCards.length.should.be.eql(1);
      t.hands.length.should.be.eql(7);
      t.hands[6].cards.length.should.be.eql(2);
      t.hands[6].visibleCards.length.should.be.eql(2);
      done();
    })
  })
  describe('#dealerTotalRange', function() {
    it('should total range for a deuce', function(done) {
      var deuce = { value: 2 };
      var dh = { visibleCards:[deuce] };
      var tr = Blackjack.dealerTotalRange(dh);
      tr.length.should.be.eql(2);
      tr[0].should.be.eql(3);
      tr[1].should.be.eql(13);
      done();
    })
    it('should total range for a jack', function(done) {
      var ten = { value: 10 };
      var dh = { visibleCards:[ten] };
      var tr = Blackjack.dealerTotalRange(dh);
      tr.length.should.be.eql(2);
      tr[0].should.be.eql(11);
      tr[1].should.be.eql(20);
      done();
    })
    it('should total range for an ace', function(done) {
      var ace = { value:[1,11] };
      var dh = { visibleCards:[ace] };
      var tr = Blackjack.dealerTotalRange(dh);
      tr.length.should.be.eql(2);
      tr[0].should.be.eql(12);
      tr[1].should.be.eql(20);
      done();
    })
  })
  describe('#visibleCardValues', function() {
    it('should return visible cards', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      var vcv = Blackjack.visibleCardValues(t);
      _.keys(vcv).length.should.be.eql(3);
      vcv[1].should.be.eql(1);
      vcv[3].should.be.eql(1);
      vcv[4].should.be.eql(1);
      (vcv[5] == null).should.be.true;
      done();
    })
  })
  describe('#calcProbabilities', function() {
    it('should calculate a single probability', function(done) {
      var p = Blackjack.calcProbabilities(9, 12, {}, 1);
      p.should.be.approximately(0.077, 0.001);
      done();
    })
    it('should calculate a face probability', function(done) {
      var p = Blackjack.calcProbabilities(10, 11, {}, 1);
      p.should.be.approximately(0.308, 0.001);
      done();
    })
    it('should calculate a sum probability', function(done) {
      var p = Blackjack.calcProbabilities(8, 10, {}, 1);
      p.should.be.approximately(0.461, 0.001);
      done();
    })
  })
  describe('#handWinningProbability', function() {
    it('should calculate a simple hand', function(done) {
      var h = { cards:[ { value: 3 }, { value: 9 } ], total: 12 };
      var p = Blackjack.handWinningProbability(h, [ 20, 20 ], {}, 1);
      p.should.be.approximately(0.154, 0.001);
      done();
    })
  })
})
