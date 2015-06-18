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
  describe('#hitme', function() {
    it('should add a card', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      var t = Blackjack.hitPlayer(0, t);
      t.hands[0].cards.length.should.be.eql(3);
      Array.isArray(t.hands[0].total).should.be.true;
      t.hands[0].total[0].should.be.eql(9);
      t.hands[0].total[1].should.be.eql(19);
      (t.hands[0].done == null).should.be.true;
      done();
    })
    it('should bust a hand', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      t = Blackjack.hitPlayer(0, t);
      t = Blackjack.hitPlayer(0, t);
      t.hands[0].cards.length.should.be.eql(4);
      Array.isArray(t.hands[0].total).should.be.false;
      t.hands[0].total.should.be.eql(15);
      (t.hands[0].done == null).should.be.true;
      t = Blackjack.hitPlayer(0, t);
      t.hands[0].cards.length.should.be.eql(5);
      t.hands[0].total.should.be.eql(22);
      t.hands[0].done.should.be.eql('Bust');
      done();
    })
    it('should 21 a hand', function(done) {
      var d = [ { value:7 }, { value:2 }, { value:4 }, { value:2 }, { value:3 }, { value:4 }, { value:3 } ];
      var t = Blackjack.openingDeal(d, 1);
      t = Blackjack.hitPlayer(0, t);
      t = Blackjack.hitPlayer(0, t);
      t = Blackjack.hitPlayer(0, t);
      t.hands[0].cards.length.should.be.eql(5);
      t.hands[0].total.should.be.eql(21);
      t.hands[0].done.should.be.eql('21!');
      done();
    })
  })
  describe('#calculateOddsToTotal', function() {
    it('should calculate odds for dealer showing 4', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      var vc = Blackjack.visibleCardValues(t);
      var probs = Blackjack.calculateOddsToTotal(t.dealerHand.total, vc, t.decks, 17);
      probs.length.should.be.eql(22);
      probs[0].should.be.approximately(0.485,0.001);
      for (var i = 2; i < 17; i++) {
        probs[i].should.be.eql(0);
      }
      probs[17].should.be.approximately(0.111,0.001);
      probs[18].should.be.approximately(0.109,0.001);
      probs[19].should.be.approximately(0.097,0.001);
      probs[20].should.be.approximately(0.093,0.001);
      probs[21].should.be.approximately(0.104,0.001);
      done();
    })
    it('should calculate odds for player showing A, 3', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      var vc = Blackjack.visibleCardValues(t);
      var lowprobs = Blackjack.calculateOddsToTotal(t.hands[0].total[0], vc, t.decks);
      var expProbs = [ 0, 0, 0, 0, 0, 0.031, 0.082, 0.061, 0.061, 0.082, 0.082, 0.082, 0.082, 0.082, 0.327, 0.031, 0, 0, 0, 0, 0, 0 ];
      var tot = 0;
      for (var i = 0; i <= 21; i++) {
        lowprobs[i].should.be.approximately(expProbs[i], 0.001);
        tot += lowprobs[i];
      }
      tot.should.be.approximately(1.00,0.01);
      var hiprobs = Blackjack.calculateOddsToTotal(t.hands[0].total[1], vc, t.decks);
      var expProbs = [ 0.520, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.031, 0.082, 0.061, 0.061, 0.082, 0.082, 0.082 ];
      tot = 0;
      for (var i = 0; i <= 21; i++) {
        hiprobs[i].should.be.approximately(expProbs[i], 0.001);
        tot += hiprobs[i];
      }
      tot.should.be.approximately(1.00,0.01);
      done();
    })
  })
  describe('#calculateWinChances', function() {
    it('should calculate win chances', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      t.hands[0].winProbability.should.be.approximately(0.444,0.001);
      t.hands[0].recommend.should.be.eql('stand');
      done();
    })
    it('should calculate win chances after hit', function(done) {
      var d = CardDeck.deck();
      var t = Blackjack.openingDeal(d, 1);
      // player has: A, 3
      t = Blackjack.hitPlayer(0, t);
      // player has: A, 3, 5 (9/19)
      t.hands[0].winProbability.should.be.approximately(0.661,0.001);
      t.hands[0].recommend.should.be.eql('stand')
      // player has: A, 3, 5, 6 (15)
      t = Blackjack.hitPlayer(0, t);
      t.hands[0].winProbability.should.be.approximately(0.443,0.001);
      t.hands[0].recommend.should.be.eql('stand')
      done();
    })
    it('should recommend hit then stand', function() {

    })
  })
})
