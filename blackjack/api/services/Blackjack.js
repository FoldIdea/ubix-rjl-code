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
    var visibleCards = Blackjack.visibleCardValues(table);
    Blackjack.calculateHandOdds(table.dealerHand, visibleCards, table.decks, 17);
    Blackjack.calculateWinChances(table);
    return table;
  },

  // calculating the odds - choosing not to take into account "used up" cards since, at least according to
  // this site: http://www.ace-ten.com/fundamentals/computing/, these are not a significant factor.
  calculateHandOdds: function(hand, visibleCards, decks, minVal) {
    // start with the total of the visible card(s)
    var total = 0;
    for (var cIdx = 0; cIdx < hand.visibleCards.length; cIdx++) {
      total = Blackjack.calcHandTotal(hand.visibleCards[cIdx], total);
    }
    var localVisible = _.clone(visibleCards);
    if (Blackjack.isRangeTotal(total)) {
      var loProbs = Blackjack.calculateOddsToTotal(total[0], localVisible, decks, minVal);
      var hiProbs = Blackjack.calculateOddsToTotal(total[1], localVisible, decks, minVal);
      // I admit I'm not quite sure how to combine these, but I'll just average them
      hand.oddsToTotals = [];
      for (var i = 0; i <= 21; i++) {
        hand.oddsToTotals.push((loProbs[i] + hiProbs[i]) / 2.0);
      }
    } else {
      hand.oddsToTotals = Blackjack.calculateOddsToTotal(total, localVisible, decks, minVal);
    }
    return hand.oddsToTotals;
  },

  calculateOddsToTotal: function(startTotal, visibleCards, decks, minValue) {
    // this array will hold the probabilities for attaining a total between 2 and 21 + bust (idx 0), NOTE: idx 1 is ignored.
    var probs = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    var divisor = (52.0*decks - _.reduce(_.values(visibleCards), function(sum, el) { return sum + el; }, 0));
    for (var cardVal = 1; cardVal <= 11; cardVal++) {
      var newTotal = startTotal + cardVal;
      var useCardVal = cardVal;
      if (cardVal == 11 && newTotal > 21) useCardVal = 1; // can't bust due to Ace 11, so treat as a 1 to get probability added in
      var inUse = visibleCards[useCardVal == 11 ? 1 : useCardVal] || 0;
      var mult = (useCardVal == 10) ? 4 : 1;
      if  (inUse == (4*mult)) continue; // all used up, so skip

      var bust = (newTotal > 21);
      var cardProb = (4.0*mult*decks - inUse) / divisor;
      // not ideal, but split probability of Aces between 1 and 11 cases
      if (useCardVal == 1 || useCardVal == 11) cardProb *= 0.5;
      if (minValue && newTotal < minValue) {
        visibleCards[useCardVal] = (visibleCards[useCardVal] || 0) + 1;
        var addProbs = Blackjack.calculateOddsToTotal(startTotal + useCardVal, visibleCards, decks, minValue);
        visibleCards[useCardVal] -= 1;
        for (var idx = 0; idx <= 21; idx++) {
          probs[idx] += addProbs[idx] * cardProb;
        }
      } else {
        probs[bust ? 0 : newTotal] += cardProb;
      }
    }
    return probs;
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
    Blackjack.calculateWinChances(table);
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

  // TODO: deal with "soft17stay" option
  calculateWinChances: function(table) {
    var visibleCards = Blackjack.visibleCardValues(table);
    for (var plIdx = 0; plIdx < table.hands.length; plIdx++) {
      var hand = table.hands[plIdx];
      var standTotal = hand.total;

      // special cases based on current total
      if (Blackjack.isRangeTotal(hand.total)) {
        if (hand.total[1] == 21) {
          hand.winProbability = 1.0;
          continue;
        } else if (hand.total[1] > 21) {
          standTotal = hand.total[0];
        } else {
          standTotal = hand.total[1];
        }
      } else if (hand.total > 21) {
        hand.winProbability = 0.0;
        continue;
      } else if (hand.total == 21) {
        hand.winProbability = 1.0;
        continue;
      }

      // work through 'hit' case
      var recommend = 'hit';
      var runningWins = 0;
      var runningGames = 0;

      // % - player stands on value below 17 (wins only if dealer naturally busts)
      var chanceDealerBusts = table.dealerHand.oddsToTotals[0];
      var fullOdds = Blackjack.calculateOddsToTotal(hand, visibleCards, table.decks);
      var chanceBelowDealerMin = 0;
      for (var tt = 2; tt < 17; tt++) { chanceBelowDealerMin += fullOdds[tt]; }
      runningWins += (chanceBelowDealerMin * chanceDealerBusts);
      runningGames += chanceBelowDealerMin;

      hand.oddsToTotals = Blackjack.calculateHandOdds(hand, visibleCards, table.decks, 17);

      // now step through chance player gets a specific total (win if dealer at or below total)
      var dealerAtOrBelowTotalOrBust = chanceDealerBusts; // start with bust % since that is also a win for this case
      for (var total = 17; total <= 20; total++) {
        var oddsOfTotal = hand.oddsToTotals[total];
        runningGames += oddsOfTotal;
        dealerAtOrBelowTotalOrBust += table.dealerHand.oddsToTotals[total];
        runningWins += (dealerAtOrBelowTotalOrBust * oddsOfTotal);
      }
      // 21 is always a win
      runningWins += hand.oddsToTotals[21];
      runningGames += hand.oddsToTotals[21];

      runningGames += hand.oddsToTotals[0]; // player busts - no wins there!

      var winProb = (runningWins / runningGames);

      // now work through "stand" probability
      runningWins = table.dealerHand.oddsToTotals[0]; // start with dealer busts chance
      for (var total = 17; total < standTotal; total++) {
        runningWins += table.dealerHand.oddsToTotals[total]; // add any dealer less than standing total
      }
      if (runningWins > winProb) {
        recommend = 'stand';
        winProb = runningWins;
      }

      // and win % is therefore "wins" over "games"
      hand.winProbability = winProb;
      hand.recommend = recommend;
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
  }
}
