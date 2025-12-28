const BASE_URL = 'https://api.pacifica.fi/api/v1';

// Типы для параметров Account API
export interface AccountParams {
    account: string;
}

export interface UpdateLeverageBody {
    account: string;
    symbol: string;
    leverage: number;
    timestamp: number;
    expiry_window?: number;
    agent_wallet?: string;
    signature: string;
}

// Account API endpoints
export const accountEndpoints = {
    /**
     * GET /api/v1/account - Получение информации об аккаунте
     * @param params - Объект с параметром account
     * @returns URL для запроса информации об аккаунте
     */
    getAccountInfo: (params: AccountParams): string => {
        const query = new URLSearchParams({ account: params.account });
        return `${BASE_URL}/account?${query}`;
    },

    /**
     * POST /api/v1/account/leverage - Обновление плеча
     * @returns URL для обновления плеча
     */
    getUpdateLeverageUrl: (): string => {
        return `${BASE_URL}/account/leverage`;
    },

    /**
     * GET /api/v1/positions - Получение позиций аккаунта
     * @param params - Объект с параметром account
     * @returns URL для запроса позиций аккаунта
     */
    getPositions: (params: AccountParams): string => {
        const query = new URLSearchParams({ account: params.account });
        return `${BASE_URL}/positions?${query}`;
    },
};

export default accountEndpoints;