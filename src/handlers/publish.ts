import { Handler } from './handler';
import { CommandOptions } from '../interface';
import { lifecycles } from '../lifecycles';
import { Lifecycle } from '../lifecycles/lifecycle';
import { ValidationError } from '../errors';

export class PublishHandler extends Handler {
    name = 'publish';

    constructor(options: CommandOptions) {
        super(options);
    }

    getLifecycles(): Lifecycle[] {
        return [lifecycles.tag, lifecycles.pushTags];
    }

    async verify() {
        const gitStatus = await this.context.git.status();

        if (gitStatus.files.length > 0 && !this.context.options.dryRun) {
            if (!this.context.options.dryRun) {
                throw new ValidationError(
                    'E_GIT_STATUS',
                    `Your current branch has uncommitted code, please retry publish after clean it.`
                );
            }
        }
        return true;
    }

    async prepare() {
        // Publish command has not bump version, it will use default branch package.json
        this.context.versions.next = this.context.versions.current;
    }
}
