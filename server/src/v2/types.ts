/**
 * Поддерживаемые биржи.
 * Используется для идентификации источника данных и логотипов.
 */
export type Exchange = "paradex" | "hyperliquid" | "pacifica" | "ethereal";

/**
 * Статус соединения с биржей.
 * Влияет на отображение индикаторов в UI (зеленый/красный кружок).
 */
export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

/**
 * Тип арбитражной стратегии.
 * perp-perp: Фьючерс против Фьючерса (нейтрально к рынку, риск в фандинге).
 * perp-spot: Фьючерс против Спота (классический базисный арбитраж).
 */
export type Strategy = "perp-perp" | "perp-spot";

/**
 * Статус возможности (Opportunity).
 * Определяет цвет бейджа и логику фильтрации.
 * - executable: Можно исполнять (прибыль > порога, есть ликвидность).
 * - marginal: Прибыль около нуля, рискованно.
 * - theoretical: Технически спред есть, но комиссии/газ съедают всё или данные устарели.
 */
export type OpportunityStatus = "executable" | "marginal" | "theoretical";

/**
 * Сырое обновление Best Bid/Offer (BBO) от биржи.
 * Самые базовые данные для расчета спреда.
 */
export interface BBOUpdate {
	exchange: Exchange;
	symbol: string;
	/** Лучшая цена покупки (за сколько мы можем продать) */
	bid: string;
	/** Объем ликвидности на лучшей цене покупки */
	bidSize: string;
	/** Лучшая цена продажи (за сколько мы можем купить) */
	ask: string;
	/** Объем ликвидности на лучшей цене продажи */
	askSize: string;
	/** Время события на бирже (для расчета задержки) */
	timestamp: number;
}

/**
 * Уровень в стакане ордеров.
 */
export interface OrderBookLevel {
	/** Цена уровня */
	price: number;
	/** Доступный объем на этом уровне */
	size: number;
}

/**
 * Обновление полного стакана (OrderBook).
 * Используется для расчета глубины (Depth) и проскальзывания (Slippage).
 */
export interface OrderBookUpdate {
	exchange: Exchange;
	symbol: string;
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	timestamp: number;
	/** Время получения сервером (для отладки) */
	receivedAt: number;
}

/**
 * Структура комиссий биржи.
 * Критически важна для расчета Net Spread.
 */
export interface ExchangeFees {
	/** Комиссия маркет-ордера (Taker) в базисных пунктах (0.01%) */
	takerFeeBps: number;
	/** Комиссия лимитного ордера (Maker) в базисных пунктах */
	makerFeeBps: number;
	/** Оценка стоимости газа на транзакцию в USD (для L1/L2 сетей) */
	gasEstimateUsd: number;
}

/**
 * Метрики глубины рынка.
 * Показывает, сколько денег можно влить в рынок без сильного сдвига цены.
 */
export interface DepthAtBps {
	/** Объем ликвидности (USD) в пределах 5 bps (0.05%) от лучшей цены */
	bps5: number;
	/** Объем ликвидности (USD) в пределах 10 bps (0.1%) от лучшей цены */
	bps10: number;
	/** Объем ликвидности (USD) в пределах 25 bps (0.25%) от лучшей цены */
	bps25: number;
}

/**
 * Полное состояние рынка по конкретному символу на конкретной бирже.
 * Агрегирует BBO, стакан и фандинг.
 */
export interface ExchangeMarketData {
	exchange: Exchange;
	symbol: string;

	// --- BBO (Best Bid Offer) ---
	bid: number;
	bidSize: number;
	ask: number;
	askSize: number;
	/** Средняя цена ((bid+ask)/2), используется как база для расчетов */
	midPrice: number;

	// --- Orderbook (Глубина) ---
	/** Массив ордеров на покупку (для расчета продажи в них) */
	bids: OrderBookLevel[];
	/** Массив ордеров на продажу (для расчета покупки в них) */
	asks: OrderBookLevel[];
	/** Агрегированная глубина бидов */
	bidDepthAtBps: DepthAtBps;
	/** Агрегированная глубина асков */
	askDepthAtBps: DepthAtBps;

	// --- Funding (Фандинг) ---
	/** Текущая ставка финансирования (для Perps). Влияет на удержание позиции. */
	fundingRate?: number;
	markPrice?: number;
	indexPrice?: number;

	// --- Meta (Метаданные) ---
	/** Время генерации данных биржей */
	timestamp: number;
	/** Время обработки нашим сервером */
	receivedAt: number;
	/** Задержка (receivedAt - timestamp). Если высокая -> риск устаревания. */
	latencyMs: number;
	/** Флаг устаревания данных (если обновлений не было > X сек) */
	isStale: boolean;
}

/**
 * Жизненный цикл возможности.
 * Помогает понять, насколько устойчив спред во времени.
 */
export interface OpportunityLifecycle {
	/** Когда спред впервые стал положительным */
	firstSeenAt: number;
	/** Последнее обновление */
	lastSeenAt: number;
	/** Сколько времени существует возможность (мс) */
	lifetimeMs: number;
	/** Максимальный зафиксированный спред за время жизни */
	peakSpreadBps: number;
	/** Средний спред за время жизни */
	avgSpreadBps: number;
	/** Сколько раз мы получали обновление с положительным спредом */
	occurrenceCount: number;
	/** История последних значений спреда (для графика sparkline) */
	spreadHistory: number[];
}

/**
 * Метрики риска.
 * Используются для расчета Score и предупреждений пользователю.
 */
export interface RiskMetrics {
	/** Волатильность цены за 1 минуту (стандартное отклонение). Высокая волатильность = риск проскальзывания. */
	volatility1m: number;
	/** Волатильность за 5 минут */
	volatility5m: number;
	/** Максимальная задержка данных между двумя биржами */
	latencyRisk: number;
	/** Разница в задержках (если одна биржа тормозит, а другая нет - это опасно) */
	latencyAsymmetryMs: number;
	/** Данные считаются устаревшими */
	staleDataRisk: boolean;
	/** Дисбаланс ликвидности (отношение бидов к аскам). Если < 0.1, риск не закрыть позицию. */
	depthImbalance: number;
	/** Список текстовых флагов рисков (например, "High Latency", "Low Liquidity") */
	riskFlags: string[];
	/** Перекос книги ордеров (синоним depthImbalance для UI) */
	bookSkew: number;
}

/**
 * ГЛАВНЫЙ ОБЪЕКТ: Арбитражная возможность.
 * Содержит всю информацию для принятия решения и исполнения.
 */
export interface ArbitrageOpportunity {
	/** Уникальный ID: SYMBOL_BuyExchange_SellExchange */
	id: string;
	symbol: string;
	strategy: Strategy;

	// --- Исполнение (Где и почем) ---
	buyExchange: Exchange;
	sellExchange: Exchange;
	/** Цена, по которой мы покупаем (Ask на бирже A) */
	buyPrice: number;
	/** Цена, по которой мы продаем (Bid на бирже B) */
	sellPrice: number;
	
	/** 
	 * Полные данные биржи покупки. 
	 * ВНИМАНИЕ: В списке (таблице) массивы bids/asks могут быть пустыми для экономии трафика.
	 * Заполняются полностью только в режиме "Детали".
	 */
	buyData: ExchangeMarketData;
	/** Полные данные биржи продажи */
	sellData: ExchangeMarketData;

	// --- Спреды (Доходность) ---
	/** "Грязный" спред в базисных пунктах ((Sell - Buy) / Buy * 10000) */
	rawSpreadBps: number;
	/** 
	 * "Чистый" спред. 
	 * RawSpread - Комиссии - Газ. Это реальная прибыль моментального входа.
	 */
	netSpreadBps: number;
	/** Абсолютная разница цен в долларах */
	spreadAbsolute: number;

	// --- Размер и Ликвидность ---
	/** Максимальный объем (USD), который можно проторговать до того, как спред станет нулевым */
	maxExecutableSize: number;
	/** Проскальзывание (потеря цены) при сделке на $1000 */
	slippageAt1k: number;
	/** Проскальзывание при сделке на $5000 */
	slippageAt5k: number;
	/** Глубина стакана на покупку в пределах 10bps (насколько легко купить) */
	depthBuyAt10Bps: number;
	/** Глубина стакана на продажу в пределах 10bps (насколько легко продать) */
	depthSellAt10Bps: number;

	// --- Расходы (Costs) ---
	/** Комиссия Taker на бирже покупки (bps) */
	buyFeesBps: number;
	/** Комиссия Taker на бирже продажи (bps) */
	sellFeesBps: number;
	/** Суммарные комиссии (bps) */
	totalFeesBps: number;
	/** Оценка газа на круг (USD) */
	gasEstimateUsd: number;

	// --- Фандинг (Funding) ---
	/** Ставка фандинга на бирже покупки (платим или получаем каждые 8ч) */
	buyFundingRate: number;
	/** Ставка фандинга на бирже продажи */
	sellFundingRate: number;
	/** 
	 * Дельта фандинга (SellFunding - BuyFunding).
	 * Если положительная -> мы получаем доп. доход за удержание позиции.
	 * Если отрицательная -> мы платим за удержание (съедает спред).
	 */
	fundingDeltaBps: number;

	// --- Аналитика ---
	/** История жизни этой возможности */
	lifecycle: OpportunityLifecycle;
	/** Оценка рисков */
	risk: RiskMetrics;

	/** 
	 * Итоговая оценка привлекательности (0-100).
	 * Учитывает спред, ликвидность, риски, время жизни.
	 */
	score: number;
	/** Итоговый статус (Исполнимо / Рискованно / Теория) */
	status: OpportunityStatus;

	/** Время последнего пересчета */
	lastUpdatedAt: number;
	/** Дублирует risk.depthImbalance для удобства доступа в таблице */
	depthImbalance: number;
}

// --- Socket.io Events ---

export interface V2ServerToClientEvents {
	/** Отправка обновления одной возможности */
	opportunity: (opp: ArbitrageOpportunity) => void;
	/** Отправка полного списка при подключении */
	snapshot: (opps: ArbitrageOpportunity[]) => void;
	/** Удаление возможности (спред исчез) */
	remove: (id: string) => void;
	/** Обновление статусов подключения бирж */
	status: (status: Record<Exchange, ConnectionStatus>) => void;
	/** Общая статистика сервера */
	stats: (stats: ServerStats) => void;
}

export interface V2ClientToServerEvents {
	/** Подписка на общий поток (таблица) */
	subscribe: (config?: SubscriptionConfig) => void;
	unsubscribe: () => void;
	/** Подписка на детальные данные конкретной пары (включая стаканы) */
	subscribeToDetails: (opportunityId: string) => void;
	/** Отписка от деталей */
	unsubscribeFromDetails: (opportunityId: string) => void;
}

export interface SubscriptionConfig {
	minNetSpreadBps?: number;
	minScore?: number;
	exchanges?: Exchange[];
	symbols?: string[];
}

export interface ServerStats {
	totalSymbols: number;
	totalOpportunities: number;
	executableCount: number;
	avgScore: number;
	updatesPerSecond: number;
	uptime: number;
}
