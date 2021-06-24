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
