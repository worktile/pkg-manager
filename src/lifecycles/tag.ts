import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import { ValidationError } from '../errors';

export class TagLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip.tag) {
            return;
        }

        const tagName = context.options.tagPrefix + context.versions.next;
        context.releaseTag = tagName;

        this.logger.info(`creating tag ${tagName}`);

        const tags = await context.git.tags();
        if (tags.all.includes(tagName) && !context.options.dryRun) {
            throw new ValidationError('E_TAG_EXIST', `tag ${tagName} has been exist in tags, please check it.`);
        }
        await this.runLifecycleHook('pretag', context.options);
        if (!context.options.dryRun) {
            await context.git.addAnnotatedTag(tagName, `chore: create release ${tagName}`);
        }
        await this.runLifecycleHook('posttag', context.options);
    }
}
