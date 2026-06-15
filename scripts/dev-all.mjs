import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootPath = fileURLToPath(new URL('../', import.meta.url));
const shouldResetDocker = process.argv.includes('--reset');

const processes = [];
let shuttingDown = false;

function spawnProcess(command, args, label) {
	const child = spawn(command, args, {
		cwd: rootPath,
		stdio: 'inherit',
		shell: process.platform === 'win32',
	});

	processes.push(child);

	child.on('exit', (code, signal) => {
		if (shuttingDown) {
			return;
		}

		if (code === 0) {
			return;
		}

		const reason = signal ? `signal ${signal}` : `code ${code}`;
		console.error(`[${label}] exited with ${reason}`);
		shutdown(typeof code === 'number' ? code : 1);
	});

	return child;
}

function shutdown(exitCode = 0) {
	if (shuttingDown) {
		return;
	}

	shuttingDown = true;

	for (const child of processes) {
		if (child.exitCode === null && !child.killed) {
			child.kill('SIGINT');
		}
	}

	setTimeout(() => process.exit(exitCode), 250);
}

async function runDockerCommand(args) {
	await new Promise((resolve, reject) => {
		const dockerProcess = spawn('docker', ['compose', ...args], {
			cwd: rootPath,
			stdio: 'inherit',
			shell: process.platform === 'win32',
		});

		dockerProcess.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`docker compose ${args.join(' ')} failed with code ${code}`));
		});

		dockerProcess.on('error', reject);
	});
}

async function prepareDocker() {
	if (shouldResetDocker) {
		await runDockerCommand(['down', '-v']);
	}

	await runDockerCommand(['up', '-d']);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
	await prepareDocker();
	spawnProcess('pnpm', ['dev'], 'frontend');
	spawnProcess('pnpm', ['dev:bff'], 'backend');
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
