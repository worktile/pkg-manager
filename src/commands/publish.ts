import { CommandModule } from 'yargs';
import { CommandOptions } from '../interface';
import _ from 'lodash';
import { PublishHandler } from '../handlers';
import { defaults } from '../defaults';
import { logger } from '../logger';

export const publishCommand: CommandModule = {
    command: ['publish'],
    describe: 'Publish package or project contains create tag, push, publish',
    builder: (yargs) => {
        yargs.option('skip', {
            alias: 's',
            desc: ` 'Map of steps in the release process that should be skipped, bump,changelog,commit,branch,tag,push',`,
            default: defaults.skip
        });
        return yargs;
    },
    handler: async (argv: any) => {
        if (!_.isObject(argv.skip)) {
            return logger.warn(`--skip args(${argv.skip}) is invalid, please use --skip.bump --skip.changelog`);
        }
        const options: CommandOptions = {
            dryRun: argv.dryRun,
            skip: argv.skip,
            defaultBranch: argv.defaultBranch,
            allowBranch: argv.allowBranch,
            releaseBranchFormat: argv.releaseBranchFormat,
            tagPrefix: argv.tagPrefix,
            hooks: argv.hooks,
            cwd: defaults.cwd
        };
        const handler = new PublishHandler(options);
        await handler.start();
    }
};
