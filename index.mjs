import inquirer from 'inquirer';
import _ from 'lodash';

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
let deck = [];
let dumped = [];
let trumpCard;
let currentPlayer;
let currentCard;

// Инициализация колоды
function initializeDeck() {
	deck = [];
	for (let suit of suits) {
		for (let rank of ranks) {
			deck.push({ suit, rank });
		}
	}
	shuffleDeck();
}

// Перемешивание колоды
function shuffleDeck() {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
}

// Раздача карт
function dealCards(players, cardsCount) {
	for (let i = 0; i < cardsCount; i++) {
		for (const player of players) {
			player.hand.push(deck.pop());
		}
	}
}

// Определение козыря
function setTrump() {
	trumpCard = deck.pop();
}

// Игроки
const player = { name: 'Игрок', hand: [] };
const bot = { name: 'Бот', hand: [] };

// Инициализация игры
function initializeGame() {
	initializeDeck();
	setTrump();
	dealCards([player, bot], 6);
}

// Отображение карт игрока
function displayPlayerHand() {
	console.log(`[Карт у бота]: ${bot.hand.length}\t[Колода]: ${deck.length}\t[Бито]: ${dumped.length}\t[Козырь]: ${trumpCard.rank} ${trumpCard.suit}\t[Карта на столе]: ${currentCard?.rank || ''} ${currentCard?.suit || ''}`);
	console.log('Ваши карты:');
	player.hand.forEach((card, index) => {
		console.log(`${index + 1}: ${card.rank} ${card.suit}`);
	});
	console.log('0: Надо брать')
}

// Ход игрока
async function playerTurn() {
	displayPlayerHand();
	const { cardIndex } = await inquirer.prompt({
		type: 'input',
		name: 'cardIndex',
		message: 'Выберите карту для хода (номер):',
		validate: (input) => {
			const index = parseInt(input);
			if (Number.isNaN(index))
				return 'Неверный выбор карты';
			if (index === 0)
				return true;
			return !Number.isNaN(index) && index - 1 >= 0 && index - 1 < player.hand.length || 'Неверный выбор карты';
		}
	});
	const i = parseInt(cardIndex);
	if (i === 0) {
		if (!currentCard)
			throw new Error('Нельзя!');
		console.log(`Вы берете: ${currentCard.rank} ${currentCard.suit}`);
		return null;
	}
	const selectedCard = player.hand.at(i - 1);
	if (currentCard && !fight(selectedCard))
		throw new Error('Нельзя!');
	console.log(`Вы ходите: ${selectedCard.rank} ${selectedCard.suit}`);
	return selectedCard;
}

// бота
function botTurn() {
	let selectedCard;
	const rSuits = _.shuffle(suits);
	const handLowest = _.sortBy(bot.hand, [card => ranks.indexOf(card.rank), card => rSuits.indexOf(card.suit)]);
	if (!currentCard) {
		selectedCard = handLowest[0];
	}
	else {
		const handRelevant = _.orderBy(bot.hand, [
			card => card.suit === currentCard.suit,
			card => card.suit === trumpCard.suit,
			card => ranks.indexOf(card.rank) >= ranks.indexOf(currentCard.rank),
			card => ranks.indexOf(card.rank)
		], ['desc', 'desc', 'desc', 'asc']);
		selectedCard = handRelevant[0];
		if (!fight(selectedCard)) {
			console.log('Бот берет');
			return null;
		}
	}

	console.log(`Бот ходит: ${selectedCard.rank} ${selectedCard.suit}`);
	return selectedCard;
}

function fight(move) {
	if (!move)
		return true;
	if (!currentCard)
		return true;
	if (move.suit !== currentCard.suit && (move.suit !== trumpCard.suit || currentCard.suit === trumpCard.suit))
		return false;
	if (ranks.indexOf(move.rank) <= ranks.indexOf(currentCard.rank))
		return false;
	return true;
}
function dump(move) {
	if (!move)
		return true;
	dumped.push(move);
	dumped.push(currentCard);
	currentCard = null;
	console.log('Бито!');
	return false;
}
function take(move) {
	let firstToTake;
	if (currentPlayer === player && !move)
		firstToTake = player;
	else if (currentPlayer === bot && !move)
		firstToTake = bot;
	else
		firstToTake = currentPlayer === player ? bot : player;
	if (currentCard) {
		firstToTake.hand.push(currentCard);
		currentCard = null;
	}
	const secondToTake = firstToTake === player ? bot : player;
	for (const p of [firstToTake, secondToTake]) {
		let i = 0;
		while (p.hand.length < 6 && deck.length > 0) {
			const card = deck.pop();
			p.hand.push(card);

			i++;
		}
		if (i > 0)
			console.log(p === player ? `Вы взяли ${i} карт в рот` : `Бот взял ${i} карт в рот`);
	}
}

// Основной цикл игры
async function playGame() {
	initializeGame();
	currentPlayer = player;

	while (player.hand.length > 0 && bot.hand.length > 0) {
		try {
			const move = currentPlayer === player ? await playerTurn() : botTurn();
			if (!fight(move))
				continue;
			currentPlayer.hand = currentPlayer.hand.filter(card => card !== move);
			let switchSides = false;
			if (!currentCard) {
				currentCard = move;
				switchSides = true;
			}
			else {
				switchSides = dump(move);
				take();
			}
			if (switchSides)
				currentPlayer = currentPlayer === player ? bot : player;
		}
		catch (err) {
			if (err.message === 'Нельзя!')
				console.log(err.message);
			else
				throw err;
		}
	}

	if (player.hand.length === 0) {
		console.log('Вы выиграли!');
	} else {
		console.log('Бот выиграл!');
	}
}

// Запуск игры
playGame();