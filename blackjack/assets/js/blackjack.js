var table = null;
var cyclePlayerIdx = null;
var cardsToDeal = [];
io.socket.on('connect', function() {
  startGame();
})

$(function() {
  $('#startGame').click(function() {
    if (cyclePlayerIdx != null) {
      if (!confirm('Abandon current game?')) return;
      cyclePlayerIdx = null;
    }
    clearGame();
    var decks = parseInt($('#go_decks').val());
    var players = parseInt($('#go_players').val());
    var soft17 = $('#go_soft17stay').val() == 'true';
    startGame(decks, players, soft17);
  });
})

function clearGame() {
  $('.cell.player').remove();
  $('#dealerhand .card').remove();
  table = null;
}

function startGame(dcks, plyers, soft17) {
  var opts = {
    decks: (dcks || 1),
    players: (plyers || 1),
    soft17stay: soft17
  }
  io.socket.get('/blackjack/gamedata', opts, function (data) {
    table = data;
    initTable();
  })
}

function initTable() {
  initHand($('#dealerhand'), table.dealerHand);
  for (var plIdx = 0; plIdx < table.hands.length; plIdx++) {
    addHand(plIdx + 1, table.hands[plIdx]);
  }
  // start game cycle
  cyclePlayer(0);
}

function endCycle() {
  var dealerHand = $('#dealerhand');
  dealerHand.find('.card').removeClass('facedown'); // reveal the deal's hidden card
  var cardCount = table.dealerHand.cards.length;
  io.socket.post('/blackjack/dealout', { table: table }, function(data) {
    table = data;
    setDoneMessage($('#dealerhand'), table.dealerHand);
    var newDealerHand = table.dealerHand;
    for (var cIdx = cardCount; cIdx < newDealerHand.cards.length; cIdx++) {
      var newCard = newDealerHand.cards[cIdx];
      addCard(dealerHand, newCard, true);
    }
    for (var plIdx = 0; plIdx < table.hands.length; plIdx++) {
      var hand = table.hands[plIdx];
      var elem = $('#player'+(plIdx+1));
      setDoneMessage(elem, hand);
      setWinProbability(elem, hand);
    }
    cyclePlayerIdx = null;
  });
}

function endPlayerCycle() {
  var nextPlayer = cyclePlayerIdx + 1;
  if (nextPlayer == table.hands.length) {
    endCycle();
  } else {
    cyclePlayer(nextPlayer);
  }
}

function cyclePlayer(playerIdx) {
  var recycle = (playerIdx == cyclePlayerIdx);
  cyclePlayerIdx = playerIdx;
  var hand = table.hands[playerIdx];
  var playerElem = $('#player'+(playerIdx+1)).parent();
  if (hand.done != null) {
    activatePlayer(playerElem, hand.done);
    endPlayerCycle();
    return;
  }

  activatePlayer(playerElem);
  if (!recycle) {
    playerElem.find('button.hit').click(hitPlayer);
    playerElem.find('button.stand').click(standPlayer);
  }
}

function activatePlayer(elem, doneStatus) {
  if (doneStatus) {
    elem.addClass('inactive ' + doneStatus);
    elem.find('button').attr('disabled','disabled');
  } else {
    elem.removeClass('inactive');
    elem.find('button').removeAttr('disabled');
  }
}

function hitPlayer() {
  var hand = table.hands[cyclePlayerIdx];
  var cardCount = hand.cards.length;
  io.socket.post('/blackjack/hitme', { player: cyclePlayerIdx, table: table }, function(data) {
    table = data;
    var newHand = table.hands[cyclePlayerIdx];
    var elem = $('#player'+(cyclePlayerIdx+1));
    if (newHand.cards.length > cardCount) {
      var newCard = newHand.cards[newHand.cards.length - 1];
      addCard(elem, newCard, true);
    }
    setDoneMessage(elem, newHand);
    for (var plIdx = 0; plIdx < table.hands.length; plIdx++) {
      setWinProbability($('#player'+(plIdx+1)), table.hands[plIdx]);
    }
    cyclePlayer(cyclePlayerIdx);
  });
}

function standPlayer() {
  var hand = table.hands[cyclePlayerIdx];
  hand.done = 'Stand';
  setDoneMessage($('#player'+(cyclePlayerIdx+1)), hand);
  cyclePlayer(cyclePlayerIdx); // this will reset and end the cycle
}

function cardMatch(card1, card2) {
  return (card1.suit == card2.suit && card1.card == card2.card);
}

function hasCard(card, cardList) {
  for (var i = 0; i < cardList.length; i++) {
    if (cardMatch(card, cardList[i])) return true;
  }
  return false;
}

function addHand(playerNo, hand) {
  var plHtml = '<div class="cell player col-lg-3 inactive">';
  plHtml += '<h3>Player ' + playerNo + "'s Hand</h3>";
  plHtml += '<div id="player' + playerNo + '" class="hand"><div class="doneMsg hidden"></div></div>';
  plHtml += '<div class="opts">';
  plHtml += '<button disabled="true" class="hit">Hit</button> <button disabled="true" class="stand">Stand</button>';
  plHtml += '<span class="rec"></span>';
  plHtml += '<span class="winpct">Win: <em></em>%</span></div></div>';
  $('#players').append(plHtml);
  initHand($('#player' + playerNo), hand);
}

function initHand(elem, hand) {
  var vc = hand.visibleCards;
  for (var cIdx = 0; cIdx < hand.cards.length; cIdx++) {
    var card = hand.cards[cIdx];
    var faceUp = vc ? hasCard(card, vc) : true;

    addCard(elem, card, faceUp);
  }
  setDoneMessage(elem, hand);
  setWinProbability(elem, hand);
}

function setDoneMessage(elem, hand) {
  var dm = $(elem).find('.doneMsg');
  if (dm.length == 0) return;
  if (hand.done == null) {
    dm.addClass('hidden');
  } else {
    dm.removeClass('hidden');
    dm.text(hand.done);
  }
}

function setWinProbability(elem, hand) {
  var winProbElem = $(elem).parent().find('.winpct');
  if (winProbElem == null) return;
  if (hand.winProbability != null) {
    winProbElem.show();
    $(winProbElem).find('em').text((hand.winProbability * 100.0).toFixed(2));
  } else {
    winProbElem.hide();
  }
  var recElem = $(elem).parent().find('.rec');
  if (hand.recommend != null && hand.done == null) {
    recElem.show();
    $(recElem).text('(' + hand.recommend + ')');
  } else {
    recElem.hide();
  }
}

function addCard(elem, card, faceUp) {
  var dealNow = (cardsToDeal.length == 0);
  cardsToDeal.push({
    el: elem,
    cd: card,
    fu: faceUp
  });
  if (dealNow) dealCard();
}

function dealCard() {
  if (cardsToDeal.length == 0) return;
  var cardToDeal = cardsToDeal[0];
  var elem = cardToDeal.el;
  var card = cardToDeal.cd;
  var faceUp = cardToDeal.fu;

  var cardIdx = (elem.find('.card')).length + 1;
  var cardVal = ($.isNumeric(card.card) ? card.card : card.card.substring(0,1).toUpperCase());
  cardVal += '&' + (card.suit == 'Diamonds' ? 'diams' : card.suit.toLowerCase()) + ';';
  var cardHtml = '<div class="card ' + card.suit + ' c' + cardIdx + (faceUp ? ' faceup' : ' facedown') + '">';
  cardHtml += '<div class="ctr">' + cardVal;
  cardHtml += '<div class="cnr tl">' + cardVal + '</div>';
  cardHtml += '<div class="cnr br">' + cardVal + '</div>';
  cardHtml += '</div></div>';
  elem.append(cardHtml);
  var elemCards = elem.children('.card');
  var newCard = $(elemCards[elemCards.length - 1]);
  var newCardOffset = newCard.offset();
  newCard.hide();

  // animate draw card to destination location
  var drawCard = $('#shoedraw');
  var drawCardPos = drawCard.position();
  var drawCardOffset = drawCard.offset();
  var endPosLeft = drawCardPos.left + (newCardOffset.left - drawCardOffset.left);
  var endPosTop = drawCardPos.top + (newCardOffset.top - drawCardOffset.top);
  drawCard.animate({
    left: endPosLeft+'px',
    top: endPosTop+'px'
  }, 400);

  // animate top card into draw position (using css animations)
  $('#shoedecktop').addClass('slid');
  setTimeout(function() {
    $('#shoedecktop').removeClass('slid');
    drawCard.css({
      left: drawCardPos.left+'px',
      top: drawCardPos.top+'px'
    });
    newCard.show();
    cardsToDeal.shift();
    dealCard();
  }, 425);
}
