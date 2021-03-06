/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { SelectVersionLifecycle } from './select-version';
import { ReleaseBranchLifecycle } from './release-branch';
import { BumpLifecycle } from './bump';
import { PushLifecycle } from './push';
import { TagLifecycle } from './tag';
import { PushTagsLifecycle } from './push-tags';

export const lifecycles = {
    selectVersion: new SelectVersionLifecycle(),
    releaseBranch: new ReleaseBranchLifecycle(),
    bump: new BumpLifecycle(),
    push: new PushLifecycle(),
    tag: new TagLifecycle(),
    pushTags: new PushTagsLifecycle()
};
