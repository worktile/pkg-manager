/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { getConfiguration } from '../configuration';
import { expect } from 'chai';
import path from 'path';

describe('#pm-configuration', () => {
    it('should get correct wtpmrc file', () => {
        const config = getConfiguration();
        expect(!!config).equals(true);
        expect(config.allowBranch).deep.equals(['master', 'v0.*']);
    });

    // it('should get correct wtpmrc file', () => {
    //     const config = getConfiguration({
    //         stopDir: path.resolve(__dirname, './')
    //     });
    //     console.log(path.resolve(__dirname, './'));
    //     console.log(config);
    // });
});
