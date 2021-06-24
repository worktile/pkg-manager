import { CommandOptions } from './interface';

export const defaults: CommandOptions = {
    defaultBranch: 'master',
    allowBranch: ['master', 'develop'],
    releaseBranchFormat: 'release-v{{version}}',
    packageDir: 'built',
    dryRun: false,
    skip: {},
    bumpFiles: ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'composer.lock'],
    preset: 'angular',
    issueUrlFormat: 'https//at.worktile.com/agile/items/{{id}}',
    commitAll: false,
    hooks: {},
    infile: 'CHANGELOG.md',
    tagPrefix: 'v',
    cwd: process.cwd()
};
