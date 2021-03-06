/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { SinonStub } from 'sinon';
import sinon from 'sinon';

export interface SimpleGitMock {
    init: SinonStub;
    addRemote: SinonStub;
    add: SinonStub;
    commit: SinonStub;
    listRemote: SinonStub;
    status: SinonStub;
    pull: SinonStub;
    addTag: SinonStub;
    push: SinonStub;
    checkout: SinonStub;
    checkoutBranch: SinonStub;
    outputHandler: SinonStub;
    branchLocal: SinonStub;
}

export function createSimpleGitMock(): SimpleGitMock {
    return {
        init: sinon.stub(),
        addRemote: sinon.stub(),
        add: sinon.stub(),
        commit: sinon.stub(),
        listRemote: sinon.stub(),
        addTag: sinon.stub(),
        push: sinon.stub(),
        pull: sinon.stub(),
        status: sinon.stub(),
        checkout: sinon.stub(),
        checkoutBranch: sinon.stub(),
        outputHandler: sinon.stub(),
        branchLocal: sinon.stub()
    };
}
