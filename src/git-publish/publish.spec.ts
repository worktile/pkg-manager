/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import simpleGit from 'simple-git/promise';
import sinon from 'sinon';
import { SinonStub } from 'sinon';
import inquirer from 'inquirer';
import path from 'path';
import { expect } from 'chai';
import { gitPublish, defaultOptions } from './publish';
import { fs } from '../fs';


describe('git-publish', () => {
    const testPath = './test_built';
    const repositoryName = 'test-publish-rep';

    let simpleGitFake: {
        init: SinonStub;
        addRemote: SinonStub;
        add: SinonStub;
        commit: SinonStub;
        listRemote: SinonStub;
        addTag: SinonStub;
        push: SinonStub;
    };

    let simpleGitCallStub: SinonStub;

    let inquirerPrompt: SinonStub;
    let inquirerFake: SinonStub;

    let existsSyncFake: SinonStub;
    let readFileSyncFake: SinonStub;

    let rmStub: SinonStub;
    let copyStub: SinonStub;
    let processExitStub: SinonStub;
    beforeEach(() => {
        simpleGitCallStub = sinon.stub(simpleGit as any, 'call');
        simpleGitFake = {
            init: sinon.stub(),
            addRemote: sinon.stub(),
            add: sinon.stub(),
            commit: sinon.stub(),
            listRemote: sinon.stub(),
            addTag: sinon.stub(),
            push: sinon.stub()
        };
        simpleGitCallStub.callsFake((simpleGit: any, basePath: string) => {
            return simpleGitFake;
        });

        inquirerPrompt = sinon.stub(inquirer, 'prompt');
        inquirerPrompt.returns(Promise.resolve({ confirm: true }));
        inquirerFake = sinon.stub().returns(Promise.resolve({ confirm: true }));

        existsSyncFake = sinon.stub(fs, 'existsSync');
        readFileSyncFake = sinon.stub(fs, 'readFileSync');

        rmStub = sinon.stub(fs, 'remove');
        copyStub = sinon.stub(fs, 'copy');
        processExitStub = sinon.stub(process, 'exit');
    });

    afterEach(() => {
        [simpleGitCallStub, existsSyncFake, readFileSyncFake, inquirerPrompt, rmStub, copyStub, processExitStub].forEach((fake) =>
            fake.restore()
        );
    });

    it('should publish with name "test-publish-rep"', async () => {
        const packageJsonFilePath = `${path.resolve(process.cwd(), testPath)}/package.json`;
        existsSyncFake.withArgs(packageJsonFilePath).returns(true);
        readFileSyncFake.withArgs(packageJsonFilePath, 'utf8').returns('{"version":"0.0.1"}');

        await gitPublish(testPath, {
            name: repositoryName
        });
        sinon.assert.callCount(existsSyncFake, 1);

        sinon.assert.callCount(copyStub, 1);
        sinon.assert.calledWith(copyStub, path.resolve(process.cwd(), testPath), path.resolve(process.cwd(), '.tmp'));

        sinon.assert.callCount(simpleGitFake.init, 1);
        sinon.assert.callCount(simpleGitFake.commit, 1);
        sinon.assert.calledWith(simpleGitFake.commit, 'chore(release): publish 0.0.1');

        sinon.assert.callCount(simpleGitFake.listRemote, 1);
        sinon.assert.calledWith(simpleGitFake.listRemote, ['--tags']);

        sinon.assert.callCount(simpleGitFake.addTag, 1);
        sinon.assert.calledWith(simpleGitFake.addTag, '0.0.1');

        sinon.assert.callCount(inquirerPrompt, 1);
        sinon.assert.callCount(readFileSyncFake, 1);
        sinon.assert.callCount(existsSyncFake, 1);
        sinon.assert.calledWith(simpleGitFake.add, './*');
        sinon.assert.calledWith(
            simpleGitFake.addRemote,
            'origin',
            `git@github.com:${defaultOptions.organizationOrUser}/${repositoryName}.git`
        );

        sinon.assert.callCount(simpleGitFake.push, 2);
        const pushFirstArgs = simpleGitFake.push.getCall(0).args;
        expect(pushFirstArgs.length).to.equals(2);
        expect(pushFirstArgs[0]).to.equals('origin');
        expect(pushFirstArgs[1]).to.equals('--tags');
        const pushSecondArgs = simpleGitFake.push.getCall(1).args;
        expect(pushSecondArgs.length).to.equals(3);
        expect(pushSecondArgs[0]).to.equals('origin');
        expect(pushSecondArgs[1]).to.equals('master');
        expect(pushSecondArgs[2]).to.deep.equals({ '-f': true });

        sinon.assert.callCount(rmStub, 1);
        sinon.assert.calledWith(rmStub, path.resolve(process.cwd(), '.tmp'));

        sinon.assert.calledOnce(processExitStub);
    });

    it('should cancel publish', async () => {
        inquirerPrompt.returns(Promise.resolve({ confirm: false }));
        const packageJsonFilePath = `${path.resolve(process.cwd(), testPath)}/package.json`;
        existsSyncFake.withArgs(packageJsonFilePath).returns(true);
        readFileSyncFake.withArgs(packageJsonFilePath, 'utf8').returns('{"version":"0.0.1"}');
        await gitPublish(testPath, {
            name: repositoryName
        });
        sinon.assert.callCount(copyStub, 0);
        sinon.assert.callCount(simpleGitFake.init, 0);
        sinon.assert.callCount(rmStub, 0);
    });

    it('should remove tmp folder when throw exception', async () => {
        const packageJsonFilePath = `${path.resolve(process.cwd(), testPath)}/package.json`;
        existsSyncFake.withArgs(packageJsonFilePath).returns(true);
        readFileSyncFake.withArgs(packageJsonFilePath, 'utf8').returns('{"version":"0.0.1"}');
        copyStub.throws(new Error(`mock error`));
        await gitPublish(testPath, {
            name: repositoryName
        });

        sinon.assert.callCount(copyStub, 1);
        sinon.assert.callCount(simpleGitFake.init, 0);
        sinon.assert.callCount(rmStub, 1);
        sinon.assert.calledWith(rmStub, path.resolve(process.cwd(), '.tmp'));
    });
});
