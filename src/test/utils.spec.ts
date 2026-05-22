/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { readPackageJson } from '../utils';
import { expect } from 'chai';
import { createBasicFixture, Fixture } from './fixtures';

describe('#readPackageJson', () => {
    let fixture: Fixture;

    beforeEach(() => {
        fixture = createBasicFixture();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should read default package.json', () => {
        const pkg = readPackageJson();

        expect(pkg).includes({
            name: 'basic-package',
            version: '1.0.0'
        });
    });

    it('should read custom packageJsonPath', () => {
        fixture.writePackageJson({
            packageJsonPath: 'packages/nested/package.json',
            name: 'nested-pkg',
            version: '3.0.0'
        });

        const pkg = readPackageJson('packages/nested/package.json');

        expect(pkg).includes({
            name: 'nested-pkg',
            version: '3.0.0'
        });
    });
});
