/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { Fixture } from './fixture';

export function createBasicFixture() {
    const fixture = new Fixture({
        workspace: 'tmp',
        version: '1.0.0',
        name: 'basic-package',
        repository: {
            type: 'git',
            url: 'git+https://github.com/wpm/basic-package.git'
        }
    });
    fixture.initializeWorkspace();
    fixture.commit('feat: first commit');
    fixture.tag('1.0.0', 'my awesome first release');
    fixture.commit('fix: patch release');
    fixture.commit('feat(core): second commit');
    return fixture;
}
