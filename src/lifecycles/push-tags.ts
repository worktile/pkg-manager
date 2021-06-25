import { Lifecycle } from './lifecycle';
import { CommandContext } from '../interface';
import { ValidationError } from '../errors';

/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
export class PushTagsLifecycle extends Lifecycle {
    async run(context: CommandContext): Promise<void> {
        if (context.options.skip.push) {
            return;
        }

        if (!context.releaseTag) {
            throw new ValidationError('E_NO_TAG', `release tag is skipped, push tag should not skip release tag`);
        }

        this.logger.success(`pushing tag ${context.releaseTag} to remote`);
        if (!context.options.dryRun) {
            await context.git.pushTags();
        }
    }
}
