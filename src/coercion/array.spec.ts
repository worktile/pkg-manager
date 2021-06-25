/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

import { coerceArray } from './array';
import { expect } from 'chai';

describe('coerceArray', () => {
    it('should wrap a string in an array', () => {
        const stringVal = 'just a string';
        expect(coerceArray(stringVal)).to.deep.equal([stringVal]);
    });

    it('should wrap a number in an array', () => {
        const numberVal = 42;
        expect(coerceArray(numberVal)).to.deep.equal([numberVal]);
    });

    it('should wrap an object in an array', () => {
        const objectVal = { something: 'clever' };
        expect(coerceArray(objectVal)).to.deep.equal([objectVal]);
    });

    it('should wrap a null value in an array', () => {
        const nullVal = null;
        expect(coerceArray(nullVal)).to.deep.equal([nullVal]);
    });

    it('should wrap an undefined value in an array', () => {
        const undefinedVal = undefined;
        expect(coerceArray(undefinedVal)).to.deep.equal([undefinedVal]);
    });

    it('should not wrap an array in an array', () => {
        const arrayVal = [1, 2, 3];
        expect(coerceArray(arrayVal)).to.deep.equal(arrayVal);
    });
});
