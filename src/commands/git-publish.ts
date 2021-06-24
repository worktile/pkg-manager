import { CommandModule } from 'yargs';
import _ from 'lodash';
import { gitPublish, defaultOptions, GitRepositoryOptions } from '../git-publish';

export const gitPublishCommand: CommandModule = {
    command: ['git-publish'],
    describe: 'publish builds artifact to git, github or gitlab',
    builder: (yargs) => {
        yargs
            .option('source', {
                alias: 's',
                desc: `built folder for publish, e.g. ./built/example`
            })
            .option('protocol', {
                desc: `ssh | https, default is ssh`,
                default: defaultOptions.protocol
            })
            .option('provider', {
                desc: `github | gitlab, default is github`,
                default: defaultOptions.provider
            })
            .option('organization', {
                alias: 'o',
                desc: `organization name or username, default is atinc`,
                default: defaultOptions.organizationOrUser
            })
            .option('name', {
                alias: 'n',
                desc: `repository's name, e.g. wt-devkit`
            });
        return yargs;
    },
    handler: async (argv: any) => {
        const options: GitRepositoryOptions = {
            name: argv.name,
            organizationOrUser: argv.organization,
            provider: argv.provider,
            protocol: argv.protocol
        };
        await gitPublish(argv.source, options, argv.dryRun);
    }
};
