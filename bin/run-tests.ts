import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const nodeOptions: string[] = [];
const testFiles: string[] = [];

for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-g' || arg === '--grep') {
        nodeOptions.push(`--test-name-pattern=${args[++i]}`);
    } else if (arg === '--test-name-pattern' && args[i + 1] != null) {
        nodeOptions.push(`${arg}=${args[++i]}`);
    } else if (arg.startsWith('-')) {
        nodeOptions.push(arg);
    } else {
        testFiles.push(arg);
    }
}

const result = spawnSync(process.execPath, [
    '--import=tsx',
    '--test',
    '--test-concurrency=1',
    ...nodeOptions,
    ...testFiles
], { stdio: 'inherit' });

if (result.error) {
    throw result.error;
}

process.exitCode = result.status ?? 1;
