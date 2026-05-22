import { ReleaseHandler } from '../../handlers';
import { CommandOptions } from '../../interface';
import { defaults } from '../../defaults';
import sinon, { SinonStub } from 'sinon';
import simpleGit from 'simple-git/promise';
import path from 'path';
import { expect } from 'chai';
import { LifecyclesMocker } from '../lifecycles-mocker';
import { createSimpleGitMock, SimpleGitMock } from '../simple-git';
import { createBasicFixture, Fixture } from '../fixtures';
import inquirer from 'inquirer';

describe('#pm-release-handler', () => {
    let releaseHandler: ReleaseHandler;
    const options: CommandOptions = Object.assign({}, defaults, {
        releaseAs: '1.0.0',
        cwd: path.resolve(process.cwd(), 'tmp')
    });

    let basicFixture: Fixture;
    let simpleGitCallStub: SinonStub;
    let simpleGitMock: SimpleGitMock;
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

    it('should run all lifecycles for release', async () => {
        simpleGitMock.status.returns(
            Promise.resolve({
                current: 'master'
            })
        );
        simpleGitMock.branchLocal.returns(Promise.resolve({ all: ['master'] }));
        const promptStub = sinon.stub(inquirer, 'prompt');
        const result = Promise.resolve({ confirm: true });
        promptStub.returns(result as any);

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

    it('should use version from custom packageJsonPath', async () => {
        basicFixture.writePackageJson({
            packageJsonPath: 'packages/app/package.json',
            name: 'app',
            version: '2.0.0'
        });

        releaseHandler = new ReleaseHandler(
            Object.assign({}, options, {
                skip: { confirm: true },
                packageJsonPath: 'packages/app/package.json'
            })
        );
        simpleGitMock.status.returns(
            Promise.resolve({
                current: 'master'
            })
        );
        simpleGitMock.branchLocal.returns(Promise.resolve({ all: ['master'] }));

        const lifecyclesMocker = new LifecyclesMocker({
            nextVersion: '3.0.0'
        });

        await releaseHandler.start();

        expect(lifecyclesMocker.runs.selectVersion.calledOnce).eq(true);
        const context = lifecyclesMocker.runs.selectVersion.getCall(0).args[0];
        expect(context.versions).deep.eq({ current: '2.0.0', next: '3.0.0' });

        lifecyclesMocker.restore();
    });
});
