module.exports = {
  calcHandTotal: function(addedCard, currentTotal) {
    if (currentTotal == null) currentTotal = 0;
    // every ace after the first counts as 1, since adding additional 11's would bust
    var newTotal = currentTotal;
    if (addedCard.value.constructor === Array && currentTotal.constructor !== Array) {
      newTotal = [ currentTotal + addedCard.value[0], currentTotal + addedCard.value[1] ];
    } else {
      var cardValue = (addedCard.value.constructor === Array) ? addedCard.value[0] : addedCard.value;
      if (currentTotal.constructor === Array) {
        newTotal = [ currentTotal[0] + cardValue, currentTotal[1] + cardValue ];
      } else {
        newTotal = currentTotal + cardValue;
      }
    }
    return newTotal;
  },

  // will return "table" object of: { shoe:{array of cards in the shoe}, dealerHand:{cards in dealer's hand}, hands:{array of player hands} }
  openingDeal: function(deck, players) {
    if (players == null) players = 1;
    // for now force players into acceptable range rather than throwing exception
    if (players < 1) players = 1;
    if (players > 7) players = 7; // Why 7? from Wikipedia: "At a casino blackjack table, the dealer faces five to seven playing positions"
    // to start, we are not going to handle "splitting" or multiple hands per player - we can add that later.
    var table = {
      shoe: deck,
      dealerHand: { cards:[], visibleCards:[], total:0 },
      hands:[]
    }
    for (var player = 0; player < players; player++) {
      table.hands.push( { cards:[], visibleCards:[], total:0, winProbability:0.0 });
    }
    // two rounds of one card to each player + the dealer
    for (var round = 0; round < 2; round++) {
      for (var player = 0; player < players; player++) {
        var card = table.shoe.shift();
        table.hands[player].cards.push(card);
        table.hands[player].visibleCards.push(card);
        table.hands[player].total = Blackjack.calcHandTotal(card, table.hands[player].total);
      }
      var card = table.shoe.shift();
      table.dealerHand.cards.push(card);
      if (round == 1) table.dealerHand.visibleCards.push(card); // start with the first dealer card hidden
      table.dealerHand.total = Blackjack.calcHandTotal(card, table.dealerHand.total);
    }
    return table;
  },

  visibleCardValues: function(table) {
    var cardVals = {};
    for (var c = 0; c < table.dealerHand.visibleCards.length; c++) {
      var cardVal = table.dealerHand.visibleCards[c].value;
      if (cardVal.constructor == Array) cardVal = cardVal[0]; // use minimum value, we'll deal with "needed card" issue later
      cardVals[cardVal] = (cardVals[cardVal] || 0) + 1;
    }
    for (var p = 0; p < table.hands.length; p++) {
      for (var c = 0; c < table.hands[p].visibleCards.length; c++) {
        var cardVal = table.hands[p].visibleCards[c].value;
        if (cardVal.constructor == Array) cardVal = cardVal[0]; // use minimum value, we'll deal with "needed card" issue later
        cardVals[cardVal] = (cardVals[cardVal] || 0) + 1;
      }
    }
    return cardVals;
  },

  // this calculates the theoritical range (min,max) for a dealer's hand based on visible card(s).
  // it currently does not take into account other visible cards, so it may not be perfect.
  // the idea is to provide a target range of "numbers to beat" by the player hands.
  dealerTotalRange: function(dealerHand) {
    var dealerVisibleTotal = 0;
    for (var c = 0; c < dealerHand.visibleCards.length; c++) {
      dealerVisibleTotal = Blackjack.calcHandTotal(dealerHand.visibleCards[c], dealerVisibleTotal);
    }
    var maxBase = dealerVisibleTotal, minBase = dealerVisibleTotal;
    if (dealerVisibleTotal.constructor === Array) {
      if (dealerVisibleTotal[1] == 21) return [21, 21];  // look for blackjack
      if (dealerVisibleTotal[1] > 21) { // if ace 11 busts, use ace 1 value
        minBase = dealerVisibleTotal[0];
        maxBase = dealerVisibleTotal[0];
      } else if (dealerVisibleTotal[0] == 1) { // if all we got is an ace, use the high value only
        minBase = dealerVisibleTotal[1];
        maxBase = dealerVisibleTotal[1];
      } else {
        minBase = dealerVisibleTotal[0];
        maxBase = dealerVisibleTotal[1] - 1;
      }
    }
    if (minBase + 1 > 21) return [22, 22]; // bust
    if (maxBase + 11 > 20) maxBase = 9; // bring max to 20
    return [ minBase + 1, maxBase + 11 ];
  },

  // calculating the probability of getting a winning hand over the dealer
  // for the time being, we'll treat "push" as a "win" since we're not betting
  // edge case: if "blackjack" or total of 21 - winning = 100%
  // standard case: for simplicity we'll assume dealer has best possible non-blackjack total based on showing card to start.
  // to start, we'll use the probability of winning as: drawing 1 card to beat the dealer's best possible hand.
  // From here: http://probability.infarom.ro/blackjack.html
  // this calculates as:
  //   x = 10:  P = (16m - nx)/(52m - nv)
  //   x != 10: P = (4m - nx)/(52m - nv)
  // where: x = target card value, nx = number of visible x cards, m = total decks, nv = total visible cards
  // Note that this strategy creates a "win chance" akin to what is used in sports games.
  calcProbabilities: function(mincard, handTotal, visibleCards, decks, startingProb) {
    var divisor = 52.0*decks - _.keys(visibleCards).length;
    var totalProb = (startingProb || 0);
    var maxcard = (mincard == 1) ? 10 : 11;
    for (var cv = mincard; cv < maxcard; cv++) {
      if (handTotal + cv > 21) break; // no point in busting
      var nx = visibleCards[(cv == 11 ? 1 : cv)] || 0; // aces are stored as 1's
      var prob = 0.0;
      if (cv == 10 && nx < 16) {
        prob = (16.0*decks - nx)/divisor;
      } else if (cv != 10 && nx < 4) {
        prob = (4.0*decks - nx)/divisor;
      }
      if (prob > 0.0) totalProb += prob;
    }
    return totalProb;
  },

  handWinningProbability: function(hand, targets, visibleCards, decks) {
    var handmin = hand.total, handmax = hand.total;
    if (hand.total.constructor === Array) {
      if (hand.total[1] > 21) {
        handmin = hand.total[0];
        handmax = hand.total[1];
      } else {
        handmin = hand.total[0];
        handmax = hand.total[1];
      }
    }
    if (handmax == 21) return 1.0; // 21! - 100% chance of win
    if (handmin > 21) return 0.0; // bust!
    // assume deals has best case for now - gotta beat that!
    var maxtarget = targets[1];
    // first, can we beat the max with 1 card?
    if (handmin + 11 < maxtarget) return 0.0; // cannot beat the dealer with one card -- maybe try again?
    // second, determine what card we need to beat or match the max target
    var mincard = maxtarget - handmin;
    // determine probs for every possible winning single card
    var winningProbability = Blackjack.calcProbabilities(mincard, handmin, visibleCards, decks);
    if (handmax != handmin) {
      var maxcard = maxtarget - handmax;
      winningProbability = Blackjack.calcProbabilities(maxcard, handmax, visibleCards, decks, winningProbability);
    }
    return winningProbability;
  }
}
