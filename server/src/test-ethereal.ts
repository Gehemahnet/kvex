import { etherealRestClient } from "./exchanges/ethereal/ethereal";

async function testEthereal() {
	try {
		console.log("1. Тестируем getProducts (эндпоинт /product)...");
		const products = await etherealRestClient.getProducts({ limit: 1 });
		console.log(`Успешно! Получено продуктов: ${products.data.length}`);

		if (products.data.length > 0) {
			for (const product of products.data) {
				console.log(`Пример тикера: ${product.ticker} (ID: ${product.id})`);
				console.log("\n2. Тестируем getFundingHistory (эндпоинт /funding)...");
				const history = await etherealRestClient.getFundingHistory({
					productId: product.id,
					range: "DAY",
					limit: 10,
					order: "asc",
				});

				console.log(
					history?.data.forEach((item) => {
						console.log(new Date(item.createdAt).toISOString());
					}),
				);
			}
		} else {
			console.warn(
				"Продукты не найдены, невозможно проверить историю фандинга.",
			);
		}
	} catch (error) {
		console.error("Ошибка при проверке:");
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(error);
		}
	}
}

testEthereal();
