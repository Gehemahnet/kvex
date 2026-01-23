import { type Ref, ref, watch } from "vue";
import { useArbitrageLabSocket } from "./useArbitrageLabSocket";
import type { ArbitrageOpportunity } from "./useArbitrageLabSocket/types";

/**
 * Интерфейс возвращаемого значения хука useOpportunityDetails.
 */
export interface UseOpportunityDetailsReturn {
	/** 
	 * Полный объект возможности с детальными данными (стаканы ордеров).
	 * Null, если данные еще не загружены или ID не выбран.
	 */
	opportunity: Ref<ArbitrageOpportunity | null>;
	/** Флаг загрузки данных */
	isLoading: Ref<boolean>;
}

/**
 * Хук для получения детальных данных по конкретной арбитражной возможности.
 * Автоматически подписывается на комнату сокета при изменении ID и отписывается при размонтировании.
 * 
 * @param opportunityId - ID возможности (например, "BTC_paradex_hyperliquid") или null
 */
export const useOpportunityDetails = (opportunityId: string | null): UseOpportunityDetailsReturn => {
	const { socket } = useArbitrageLabSocket();
	const opportunity = ref<ArbitrageOpportunity | null>(null);
	const isLoading = ref(false);

	// Watch for ID changes to resubscribe
	watch(
		() => opportunityId,
		(newId, oldId) => {
			if (oldId) {
				unsubscribe(oldId);
			}
			if (newId) {
				subscribe(newId);
			} else {
				opportunity.value = null;
			}
		},
		{ immediate: true }
	);

	function subscribe(id: string) {
		if (!socket.value) return;
		
		isLoading.value = true;
		
		// Subscribe to the specific room
		socket.value.emit("subscribeToDetails", id);
		
		// Listen for updates specifically for this ID
		// Note: The main socket listener in useArbitrageLabSocket also receives this,
		// but we might want a dedicated local listener or just rely on the global store update.
		// For simplicity, we'll rely on the global store update which propagates to getOpportunity(id).
		
		// However, since we stripped data from the main feed, the global store might have the stripped version
		// until the full version arrives.
		
		// Let's set up a temporary listener to catch the full object immediately
		const handler = (opp: ArbitrageOpportunity) => {
			if (opp.id === id) {
				opportunity.value = opp;
				isLoading.value = false;
			}
		};
		
		socket.value.on("opportunity", handler);
		
		// Cleanup listener when ID changes
		(subscribe as any).cleanup = () => {
			socket.value?.off("opportunity", handler);
		};
	}

	function unsubscribe(id: string) {
		if (!socket.value) return;
		
		socket.value.emit("unsubscribeFromDetails", id);
		if ((subscribe as any).cleanup) {
			(subscribe as any).cleanup();
		}
	}

	return {
		opportunity,
		isLoading
	};
};
