import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import latestSemverTag from 'standard-version/lib/latest-semver-tag';
import chalk from 'chalk';
import semver, { ReleaseType } from 'semver';
import inquirer from 'inquirer';
import { ValidationError, CommandTerminationError } from '../errors';

const RELEASE_TYPES: ReleaseType[] = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];

export class SelectVersionLifecycle extends Lifecycle {
    private async typingReleaseVersion(version: string): Promise<string> {
        const { newVersion } = await inquirer.prompt({
            name: 'newVersion',
            type: 'input',
            message: `Please input release version`,
            default: semver.inc(version, 'patch')
        });
        if (newVersion) {
            if (semver.valid(newVersion)) {
                if (semver.lte(newVersion, version)) {
                    this.logger.warn(`input version: ${chalk.red(newVersion)} is lte ${version}, please re-typing`);
                    return await this.typingReleaseVersion(version);
                } else {
                    return newVersion;
                }
            } else {
                this.logger.warn(`input version: ${chalk.red(newVersion)} is invalid, please re-typing`);
                return await this.typingReleaseVersion(version);
            }
        } else {
            throw new ValidationError('E_NO_VERSION', `release has been cancelled`);
        }
    }

    private getNextVersionFromExplicit(context: CommandContext) {
        const version = context.versions.current;
        let nextVersion = null;
        if (context.options.releaseAs) {
            if (semver.valid(context.options.releaseAs)) {
                nextVersion = context.options.releaseAs;
            } else {
                const releaseType = context.options.releaseAs as ReleaseType;
                if (!RELEASE_TYPES.includes(context.options.releaseAs as ReleaseType)) {
                    throw new ValidationError('E_INVALID_RELEASE', `input releaseAs(${context.options.releaseAs}) version is invalid`);
                }
                nextVersion = semver.inc(version, releaseType);
            }
            if (semver.lte(nextVersion, version)) {
                throw new ValidationError(
                    'E_INVALID_RELEASE',
                    `input releaseAs(${context.options.releaseAs}) is lte ${version}, please re-typing`
                );
            } else {
                return nextVersion;
            }
        }
    }

    private async getNextVersionFromPrompt(context: CommandContext): Promise<string> {
        const version = context.versions.current;
        const releases = RELEASE_TYPES.map((release: ReleaseType) => {
            return {
                name: `${release} ${version} => ${semver.inc(version, release)}`,
                value: release
            };
        });
        const releaseQuestions = [
            {
                name: 'releaseAs',
                type: 'list',
                message: 'What do you want release as version?',
                choices: [
                    ...releases,
                    {
                        value: 'typing',
                        name: 'typing version manually'
                    },
                    new inquirer.Separator('----------------------------------')
                ]
            }
        ];
        const { releaseAs } = await inquirer.prompt(releaseQuestions);
        if (releaseAs) {
            if (releaseAs === 'typing') {
                return await this.typingReleaseVersion(version);
            } else {
                return semver.inc(version, releaseAs);
            }
        } else {
            throw new ValidationError('E_NO_RELEASE_AS', `release-as is empty`);
        }
    }

    async run(context: CommandContext): Promise<void> {
        const tagVersion = await latestSemverTag();
        const version = context.versions.current;
        this.logger.info(`current version is ${chalk.green(version)} and latest tag is ${chalk.green(tagVersion)}`);
        let nextVersion = this.getNextVersionFromExplicit(context);
        if (!nextVersion) {
            nextVersion = await this.getNextVersionFromPrompt(context);
        }

        const { confirm } = await inquirer.prompt({
            name: 'confirm',
            type: 'confirm',
            message: `You will release ${nextVersion} from ${chalk.blue(version)} => ${chalk.green(
                nextVersion
            )}.\n Do you want to continue?`,
            default: true
        });
        if (confirm) {
            context.versions.next = nextVersion;
        } else {
            throw new CommandTerminationError(`release has been cancelled`);
        }
    }
}
