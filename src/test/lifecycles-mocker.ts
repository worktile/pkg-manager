/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import sinon, { SinonStub } from 'sinon';
import { lifecycles } from '../lifecycles';
import { expect } from 'chai';
import { CommandContext, CommandOptions } from '../interface';
import simpleGit, { SimpleGit } from 'simple-git/promise';

export interface LifecyclesMockData {
    nextVersion: string;
}

export class LifecyclesMocker {
    runs: {
        selectVersion: SinonStub;
        releaseBranch: SinonStub;
        bump: SinonStub;
        tag: SinonStub;
        push: SinonStub;
        pushTags: SinonStub;
    };

    mockData: LifecyclesMockData;

    constructor(data: LifecyclesMockData) {
        this.runs = {
            selectVersion: sinon.stub(lifecycles.selectVersion, 'run'),
            releaseBranch: sinon.stub(lifecycles.releaseBranch, 'run'),
            bump: sinon.stub(lifecycles.bump, 'run'),
            tag: sinon.stub(lifecycles.tag, 'run'),
            push: sinon.stub(lifecycles.push, 'run'),
            pushTags: sinon.stub(lifecycles.pushTags, 'run')
        };
        this.runs.selectVersion.callsFake(context => {
            context.versions.next = data.nextVersion;
            return Promise.resolve();
        });

        this.mockData = data;
    }

    restore() {
        Object.keys(this.runs).forEach(key => {
            this.runs[key].restore();
        });
    }

    verifyPublish(cmdOptions: CommandOptions) {
        this.verifyTag(cmdOptions);
        this.verifyPushTags(cmdOptions);
    }

    verifyRelease(cmdOptions: CommandOptions, options: { git: SimpleGit }) {
        this.verifySelectVersion(cmdOptions);
        this.verifyReleaseBranch(cmdOptions);
        this.verifyBump(cmdOptions);
        this.verifyPush(cmdOptions);
        this.verifySelectVersion(cmdOptions);
    }

    verifySelectVersion(options: CommandOptions) {
        expect(this.runs.selectVersion.calledOnce).eq(true);
        const context = this.runs.selectVersion.getCall(0).args[0];
        expect(context.options).deep.eq(options);
        expect(context.versions).deep.eq({ current: '1.0.0', next: this.mockData.nextVersion });
    }

    verifyBump(options: CommandOptions) {
        expect(this.runs.bump.calledOnce).eq(true);
        const context: CommandContext = this.runs.bump.getCall(0).args[0];
        expect(context.options).deep.eq(options);
    }

    verifyReleaseBranch(options: CommandOptions) {
        expect(this.runs.releaseBranch.calledOnce).eq(true);
        const context: CommandContext = this.runs.releaseBranch.getCall(0).args[0];
        expect(context.options).deep.eq(options);
    }

    verifyPush(options: CommandOptions) {
        expect(this.runs.push.calledOnce).eq(true);
        const context: CommandContext = this.runs.push.getCall(0).args[0];
        expect(context.options).deep.eq(options);
    }

    verifyPushTags(options: CommandOptions) {
        expect(this.runs.pushTags.calledOnce).eq(true);
        const context: CommandContext = this.runs.pushTags.getCall(0).args[0];
        expect(context.options).deep.eq(options);
    }

    verifyTag(options: CommandOptions) {
        expect(this.runs.tag.calledOnce).eq(true);
        const context: CommandContext = this.runs.tag.getCall(0).args[0];
        expect(context.options).deep.eq(options);
    }
}
