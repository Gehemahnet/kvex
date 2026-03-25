import type { Column, LowercaseExchange } from "../../common/types";
import { EXCHANGES } from "../../common/constants";
import type { BackendFundingRate } from "../../api/backend/useFundingRates.query";
import type {
	MarketItemWithExchange,
	MergeExchangesDataResult,
} from "./useFundingInfo.types";

// Передаем activeExchanges, чтобы строить колонки только для выбранных бирж
export const buildColumns = (activeExchanges: Set<LowercaseExchange>): Column[] => {
	const exchangeColumns = Array.from(activeExchanges).map((ex) => ({
		columnKey: ex,
		header: ex,
		field: `${ex}1h`,
	}));

	const serviceColumns = [
		{
			header: "Symbol",
			columnKey: "symbol",
			field: "symbol",
		},
		{
			header: "Best APR",
			columnKey: "bestApr",
			field: "bestApr",
		},
	];

	return [...serviceColumns, ...exchangeColumns];
};

export const transformBackendData = (
	data: BackendFundingRate[],
	activeExchanges: Set<LowercaseExchange>,
): MergeExchangesDataResult => {
	const exchangeNames = new Set<LowercaseExchange>();
	const symbolMap = new Map<string, MarketItemWithExchange>();

	// Группируем плоский массив из БД по монетам
	for (const row of data) {
		const ex = row.exchange as LowercaseExchange;
		
		// Игнорируем биржу, если она отключена в фильтре UI
		if (!activeExchanges.has(ex)) continue;
		
		exchangeNames.add(ex);

		if (!symbolMap.has(row.symbol)) {
			symbolMap.set(row.symbol, { symbol: row.symbol });
		}
		const item = symbolMap.get(row.symbol)!;
		
		// Сохраняем ставку (приводим к строке, как ожидал старый UI)
		item[`${ex}1h` as keyof MarketItemWithExchange] = String(row.funding_rate);
	}

	const unifiedItems: MarketItemWithExchange[] = [];

	for (const [symbol, item] of symbolMap) {
		const exchangeRates: { exchange: LowercaseExchange; rate: number }[] = [];
		for (const ex of exchangeNames) {
			const rateStr = item[`${ex}1h` as keyof MarketItemWithExchange] as string | undefined;
			if (rateStr !== undefined) {
				exchangeRates.push({ exchange: ex, rate: Number(rateStr) });
			}
		}

		// Добавляем в итоговый список ТОЛЬКО если монета есть минимум на 2-х выбранных биржах
		if (exchangeRates.length >= 2) {
			const maxRateItem = exchangeRates.reduce((prev, current) =>
				current.rate > prev.rate ? current : prev,
			);
			const minRateItem = exchangeRates.reduce((prev, current) =>
				current.rate < prev.rate ? current : prev,
			);

			item.bestApr = String(maxRateItem.rate - minRateItem.rate);
			item.shortExchange = maxRateItem.exchange;
			item.longExchange = minRateItem.exchange;
			
			unifiedItems.push(item);
		}
		// Иначе просто игнорируем (скрываем мусор из выдачи)
	}

	return {
		items: unifiedItems,
		exchangeNames,
	};
};
