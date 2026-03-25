import { pool } from "./db.js";

async function checkDb() {
	try {
		console.log("Checking database...");
		
		// Получаем общее количество записей
		const countRes = await pool.query('SELECT COUNT(*) FROM funding_rates');
		console.log(`\n📊 Всего записей в базе: ${countRes.rows[0].count}`);

		// Получаем 10 самых свежих записей для наглядности
		const sampleRes = await pool.query(`
			SELECT id, exchange, symbol, funding_rate, timestamp 
			FROM funding_rates 
			ORDER BY timestamp DESC 
			LIMIT 10
		`);
		
		console.log('\n🔍 Последние 10 записей (сэмпл):');
		console.table(sampleRes.rows);

		// Проверяем, с каких бирж вообще пришли данные
		const exchangesRes = await pool.query(`
			SELECT exchange, COUNT(*) as count 
			FROM funding_rates 
			GROUP BY exchange
		`);
		
		console.log('\n🏢 Записи по биржам:');
		console.table(exchangesRes.rows);

	} catch (error) {
		console.error("Error querying database:", error);
	} finally {
		await pool.end();
		process.exit(0);
	}
}

checkDb();
