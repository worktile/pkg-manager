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

    it('should load configuration from a specified config file', () => {
        const configPath = path.resolve(__dirname, './fixtures/custom.wpmrc.js');
        const config = getConfiguration(undefined, configPath);
        expect(config.allowBranch).deep.equals(['custom-branch']);
    });
});
