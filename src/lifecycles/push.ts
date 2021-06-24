import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import chalk from 'chalk';

export class PushLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip.push) {
            return;
        }
        this.logger.info(`pushing ${chalk.green(context.releaseBranch)} to remote`);
        if (!context.options.dryRun && context.releaseBranch) {
            context.git.outputHandler((command, stdout, stderr) => {
                stdout.pipe(process.stdout);
                stderr.pipe(process.stderr);
            });
            await context.git.push('origin', context.releaseBranch);
        }
    }
}
