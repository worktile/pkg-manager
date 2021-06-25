/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import path from 'path';
import { ReleaseHandler } from '../handlers';
import { CommandOptions } from '../interface';
import { defaults } from '../defaults';
import sinon, { SinonStub } from 'sinon';
import simpleGit, { SimpleGit } from 'simple-git/promise';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createBasicFixture, Fixture } from './fixtures';
import { expect } from 'chai';

describe.skip('#pm-integration', () => {
    let releaseHandler: ReleaseHandler;
    const options: CommandOptions = Object.assign({}, defaults, {
        releaseAs: '1.0.1',
        cwd: path.resolve(process.cwd(), 'tmp'),
        skip: {
            selectVersion: true
        }
    });

    let simpleGitCallStub: SinonStub;
    let git: SimpleGit;
    let basicFixture: Fixture;

    beforeEach(async () => {
        basicFixture = createBasicFixture();
        git = simpleGit(options.cwd);
        // release handler
        releaseHandler = new ReleaseHandler(options);

        // mock simpleGit
        simpleGitCallStub = sinon.stub(simpleGit as any, 'call');
        simpleGitCallStub.returns(git);
    });

    afterEach(() => {
        basicFixture.destroy();
    });

    describe('#release', function () {
        it('populates changelog with commits since last tag by default', async function () {
            const NEXT_VERSION = '1.0.1';
            options.releaseAs = NEXT_VERSION;
            const pullStub = sinon.stub(git, 'pull');
            const checkoutStub = sinon.stub(git, 'checkout');
            const pushStub = sinon.stub(git, 'push');
            const checkoutBranchStub = sinon.stub(git, 'checkoutBranch');
            const branchLocalStub = sinon.stub(git, 'branchLocal');
            branchLocalStub.returns(Promise.resolve({ all: ['master'], branches: null }) as any);
            const promptStub = sinon.stub(inquirer, 'prompt');
            const result = Promise.resolve({ confirm: true });
            promptStub
                .withArgs({
                    name: 'confirm',
                    type: 'confirm',
                    message: `You will release ${chalk.green('master')} branch, allow release branches: ${chalk.blue(
                        'master develop'
                    )}. \n Do you want to continue?`,
                    default: true
                })
                .returns(result as any);
            promptStub
                .withArgs({
                    name: 'confirm',
                    type: 'confirm',
                    message: `You will release ${NEXT_VERSION} from ${chalk.blue('1.0.0')} => ${chalk.green(
                        NEXT_VERSION
                    )}.\n Do you want to continue?`,
                    default: true
                })
                .returns(result as any);
            await releaseHandler.start();

            // verify changelog
            const content = basicFixture.readChangelog();
            expect(content.includes('first commit')).eq(false);
            expect(content.includes('patch release')).eq(true);
            expect(content.includes('second commit')).eq(true);

            // verify create branch
            expect(checkoutBranchStub.calledOnce).eq(true);
            const checkoutBranchArgs = checkoutBranchStub.getCall(0).args;
            expect(checkoutBranchArgs).deep.eq([`release-v${NEXT_VERSION}`, 'master']);

            // verify push to origin
            expect(pushStub.calledOnce).eq(true);
            const pushArgs = pushStub.getCall(0).args;
            expect(pushArgs).deep.eq(['origin', `release-v${NEXT_VERSION}`]);

            sinon.restore();
            // pullStub.restore();
            // checkoutStub.restore();
            // pushStub.restore();
            // promptStub.restore();
        });
    });
});
