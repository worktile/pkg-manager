/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import { ValidationError } from '../errors';
import { defaults } from '../defaults';

export class TagLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip?.tag) {
            return;
        }

        const git = context.git;

        const { next } = this.requireVersions(context);
        const tagPrefix = context.options.tagPrefix ?? defaults.tagPrefix ?? 'v';
        const tagName = tagPrefix + next;
        context.releaseTag = tagName;

        this.logger.info(`creating tag ${tagName}`);

        const tags = await git.tags();
        if (tags.all.includes(tagName) && !context.options.dryRun) {
            throw new ValidationError('E_TAG_EXIST', `tag ${tagName} has been exist in tags, please check it.`);
        }
        await this.runLifecycleHook('pretag', context.options);
        if (!context.options.dryRun) {
            await git.addAnnotatedTag(tagName, `build: create release ${tagName}`);
        }
        await this.runLifecycleHook('posttag', context.options);
    }
}
