module.exports = {
  isRangeTotal: function(total) {
    return (total.constructor === Array);
  },

  calcHandTotal: function(addedCard, currentTotal) {
    if (currentTotal == null) currentTotal = 0;
    // every ace after the first counts as 1, since adding additional 11's would bust
    var newTotal = currentTotal;
    if (Blackjack.isRangeTotal(addedCard.value) && currentTotal.constructor !== Array) {
      newTotal = [ currentTotal + addedCard.value[0], currentTotal + addedCard.value[1] ];
    } else {
      var cardValue = Blackjack.isRangeTotal(addedCard.value) ? addedCard.value[0] : addedCard.value;
      if (Blackjack.isRangeTotal(currentTotal)) {
        newTotal = [ currentTotal[0] + cardValue, currentTotal[1] + cardValue ];
        if (newTotal[1] > 21) { // stop tracking if we've busted on the high end
          newTotal = newTotal[0];
        }
      } else {
        newTotal = currentTotal + cardValue;
      }
    }
    return newTotal;
  },

  // will return "table" object of: { shoe:{array of cards in the shoe}, dealerHand:{cards in dealer's hand}, hands:{array of player hands} }
  openingDeal: function(deck, players, gameOptions) {
    if (players == null) players = 1;
    // for now force players into acceptable range rather than throwing exception
    if (players < 1) players = 1;
    if (players > 7) players = 7; // Why 7? from Wikipedia: "At a casino blackjack table, the dealer faces five to seven playing positions"
    // to start, we are not going to handle "splitting" or multiple hands per player - we can add that later.
    var table = {
      options: gameOptions,
      decks: (deck.length / 52),
      shoe: deck,
      dealerHand: { cards:[], visibleCards:[], total:0 },
      hands:[]
    }
    for (var player = 0; player < players; player++) {
      table.hands.push( { cards:[], visibleCards:[], total:0 });
    }
    // two rounds of one card to each player + the dealer
    for (var round = 0; round < 2; round++) {
      for (var player = 0; player < players; player++) {
        var card = table.shoe.shift();
        table.hands[player].cards.push(card);
        table.hands[player].visibleCards.push(card);
        var plTotal = Blackjack.calcHandTotal(card, table.hands[player].total);
        table.hands[player].total = plTotal;
        if (Blackjack.isRangeTotal(plTotal) && plTotal[1] == 21) {
          table.hands[player].done = 'Blackjack!';
        }
      }
      var card = table.shoe.shift();
      table.dealerHand.cards.push(card);
      if (round == 1) table.dealerHand.visibleCards.push(card); // start with the first dealer card hidden
      table.dealerHand.total = Blackjack.calcHandTotal(card, table.dealerHand.total);
    }
    Blackjack.insertWinChance(table);
    return table;
  },

  hitPlayer: function(playerIdx, table) {
    var hand = table.hands[playerIdx];
    var nextCard = table.shoe.shift();
    hand.cards.push(nextCard);
    hand.visibleCards.push(nextCard);
    hand.total = Blackjack.calcHandTotal(nextCard, hand.total);
    if (hand.total.constructor !== Array && hand.total > 21) {
      hand.done = 'Bust';
      hand.winProbability = 0.0;
    } else if ((Blackjack.isRangeTotal(hand.total) && hand.total[1] == 21) || (!Blackjack.isRangeTotal(hand.total) && hand.total == 21)) {
      hand.done = '21!'
      hand.winProbability = 1.0;
    }
    Blackjack.insertWinChance(table);
    return table;
  },

  dealerMustHit: function(hand, gameOptions) {
    var mustHit = false;
    if (Blackjack.isRangeTotal(hand.total)) {
      if (hand.total[1] == 17) {
        mustHit = (gameOptions == null || !gameOptions.soft17stay);
      } else if (hand.total[1] > 21) {
        mustHit = hand.total[0] < 17;
      } else {
        mustHit = hand.total[1] < 17;
      }
    } else {
      mustHit = (hand.total < 17);
    }
    return mustHit;
  },

  dealOut: function(table) {
    var hand = table.dealerHand;
    hand.visibleCards = _.clone(hand.cards); // make all cards visible
    while (Blackjack.dealerMustHit(hand, table.options)) {
      var nextCard = table.shoe.shift();
      hand.cards.push(nextCard);
      hand.visibleCards.push(nextCard);
      hand.total = Blackjack.calcHandTotal(nextCard, hand.total);
    }
    if (Blackjack.isRangeTotal(hand.total)) {
      hand.total = (hand.total[1] > 21) ? hand.total[0] : hand.total[1];
    }
    if (hand.total > 21) {
      hand.done = 'Bust';
    } else if (hand.total == 21) {
      hand.done = '21!'
    } else {
      hand.done = hand.total.toString();
    }
    // determine final state of players
    for (var plIdx = 0; plIdx < table.hands.length; plIdx++) {
      var plHand = table.hands[plIdx];
      var total = plHand.total;
      if (Blackjack.isRangeTotal(total)) {
        total = (total[1] > 21) ? total[0] : total[1];
      }
      if (total > 21) {
        plHand.done = 'Bust';
        plHand.winProbability = 0.0;
      } else if (hand.total > 21) {
        plHand.done = 'Win';
        plHand.winProbability = 1.0;
      } else if (hand.total < total) {
        plHand.done = 'Win';
        plHand.winProbability = 1.0;
      } else if (hand.total == total) {
        plHand.done = 'Push';
        plHand.winProbability = 1.0;
      } else {
        plHand.done = 'Lose';
        plHand.winProbability = 0.0;
      }
    }
    return table;
  },

  insertWinChance: function(table) {
    var dealerRange = Blackjack.dealerTotalRange(table.dealerHand);
    var visibleCards = Blackjack.visibleCardValues(table);
    for (var handIdx = 0; handIdx < table.hands.length; handIdx++) {
      var hand = table.hands[handIdx];
      if (!hand.done) {
        hand.winProbability = Blackjack.handWinningProbability(hand, dealerRange, visibleCards, table.decks);
      }
    }
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
  //
  // for future consideration, here are charts for dealer probability of hand based on showing card:
  // http://wizardofodds.com/games/blackjack/appendix/2a/
  dealerTotalRange: function(dealerHand) {
    var dealerVisibleTotal = 0;
    for (var c = 0; c < dealerHand.visibleCards.length; c++) {
      dealerVisibleTotal = Blackjack.calcHandTotal(dealerHand.visibleCards[c], dealerVisibleTotal);
    }
    var maxBase = dealerVisibleTotal, minBase = dealerVisibleTotal;
    if (Blackjack.isRangeTotal(dealerVisibleTotal)) {
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
    if (minBase < 16) minBase = 16; // +1 = 17 - mininum required by rules
    if (maxBase < 6) maxBase = 6; // +11 = 17 - minimum required by rules
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
    if (Blackjack.isRangeTotal(hand.total)) {
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
    // assume dealer has base (17) case for now.
    var maxtarget = targets[0];
    // first, can we beat the max with 1 card?
    if (handmax + 11 < maxtarget) return 0.0; // cannot beat the dealer with one card -- maybe try again?
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
