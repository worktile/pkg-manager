import { ReleaseHandler } from '../../handlers';
import { CommandOptions } from '../../interface';
import { defaults } from '../../defaults';
import sinon, { SinonSpy, SinonStub } from 'sinon';
import simpleGit, { SimpleGit } from 'simple-git/promise';
import { lifecycles } from '../../lifecycles';
import path from 'path';
import { expect } from 'chai';
import { LifecyclesMocker } from '../lifecycles-mocker';
import { createSimpleGitMock, SimpleGitMock } from '../simple-git';
import { Fixture, createBasicFixture } from '../fixtures';
import inquirer from 'inquirer';

describe('#pm-publish-handler', () => {
    let releaseHandler: ReleaseHandler;
    const options: CommandOptions = Object.assign({}, defaults, {
        releaseAs: '1.0.0',
        cwd: path.resolve(process.cwd(), 'tmp')
    });

    let simpleGitCallStub: SinonStub;
    let simpleGitMock: SimpleGitMock;
    let basicFixture: Fixture;
    beforeEach(() => {
        basicFixture = createBasicFixture();
        // release handler
        releaseHandler = new ReleaseHandler(options);

        // mock simpleGit
        simpleGitCallStub = sinon.stub(simpleGit as any, 'call');
        simpleGitMock = createSimpleGitMock();
        simpleGitCallStub.callsFake((simpleGit: any, basePath: string) => {
            return simpleGitMock;
        });
    });

    afterEach(() => {
        simpleGitCallStub.restore();
        basicFixture.destroy();
    });

    it('should run all lifecycles for publish', async () => {
        simpleGitMock.status.returns(
            Promise.resolve({
                current: 'master'
            })
        );
        const promptStub = sinon.stub(inquirer, 'prompt');
        const result = Promise.resolve({ confirm: true });
        promptStub.returns(result as any);

        simpleGitMock.branchLocal.returns(Promise.resolve({ all: ['master'] }));
        const NEXT_VERSION = '2.0.0';

        const lifecyclesMocker = new LifecyclesMocker({
            nextVersion: NEXT_VERSION
        });

        await releaseHandler.start();

        lifecyclesMocker.verifyRelease(options, {
            git: simpleGitMock as any
        });

        lifecyclesMocker.restore();
        promptStub.restore();
    });
});
