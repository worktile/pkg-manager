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
import { Handler } from '../../handlers/handler';
import { Lifecycle } from '../../lifecycles/lifecycle';
import chalk from 'chalk';

class MyHandler extends Handler {
    name = 'my-command';

    constructor(options: CommandOptions) {
        super(options);
    }

    getLifecycles(): Lifecycle[] {
        return [];
    }

    async verify(): Promise<boolean> {
        return true;
    }

    async prepare(): Promise<void> {}
}
describe('#handler', () => {
    let myHandler: MyHandler;
    const options: CommandOptions = Object.assign({}, defaults, {
        releaseAs: '1.0.0',
        cwd: path.resolve(process.cwd(), 'tmp')
    });

    let simpleGitCallStub: SinonStub;
    let simpleGitMock: SimpleGitMock;
    let basicFixture: Fixture;
    beforeEach(() => {
        basicFixture = createBasicFixture();

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

    it('should prompt confirm when current branch is match allowBranch', async () => {
        myHandler = new MyHandler({
            allowBranch: 'master',
            skip: {}
        });
        simpleGitMock.status.returns(
            Promise.resolve({
                current: 'master'
            })
        );
        const promptStub = sinon.stub(inquirer, 'prompt');
        const result = Promise.resolve({ confirm: true });
        promptStub.returns(result as any);
        simpleGitMock.branchLocal.returns(Promise.resolve({ all: ['master'] }));

        await myHandler.start();

        promptStub.restore();
    });

    it('should prompt confirm when current branch is not match allowBranch', async () => {
        myHandler = new MyHandler({
            allowBranch: 'master'
        });
        simpleGitMock.status.returns(
            Promise.resolve({
                current: 'develop'
            })
        );
        simpleGitMock.branchLocal.returns(Promise.resolve({ all: ['master', 'release-7.0'] }));
        const promptStub = sinon.stub(inquirer, 'prompt');
        promptStub
            .withArgs([
                {
                    name: 'targetBranch',
                    type: 'list',
                    message: 'What do you want my-command as branch?',
                    choices: [{ name: 'master', value: 'master' }]
                }
            ])
            .returns(Promise.resolve({ targetBranch: 'master' }) as any);

        await myHandler.start();

        promptStub.restore();
    });

    it('should match glob branch v7.*', async () => {
        const currentBranch = 'v7.0.0';
        myHandler = new MyHandler({
            allowBranch: 'v7.*'
        });
        simpleGitMock.status.returns(
            Promise.resolve({
                current: currentBranch
            })
        );
        const message = `You will ${myHandler.name} ${chalk.green(currentBranch)} branch, allow ${myHandler.name} branches: ${chalk.blue(
            'v7.*'
        )}. \n Do you want to continue?`;
        const promptStub = sinon.stub(inquirer, 'prompt');
        promptStub
            .withArgs({
                name: 'confirm',
                type: 'confirm',
                message,
                default: true
            })
            .returns(Promise.resolve({ confirm: true }) as any);

        await myHandler.start();

        promptStub.restore();
    });
});
