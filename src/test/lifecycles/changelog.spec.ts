/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import path from 'path';
import fs from 'fs';
import sinon from 'sinon';
import { expect } from 'chai';
import { ChangelogLifecycle } from '../../lifecycles/changelog';
import { CommandContext } from '../../interface';
import { defaults } from '../../defaults';
import { Fixture } from '../fixtures/fixture';

describe('ChangelogLifecycle', () => {
    const workspace = 'tmp-changelog-dry-run';

    let fixture: Fixture;
    let lifecycle: ChangelogLifecycle;
    let loggerInfoStub: sinon.SinonStub;
    let consoleLogStub: sinon.SinonStub;
    let writeFileSyncSpy: sinon.SinonSpy;

    beforeEach(() => {
        fixture = new Fixture({
            workspace,
            version: '1.0.0',
            name: 'test-pkg',
            repository: {
                type: 'git',
                url: 'git+https://github.com/wpm/test-pkg.git'
            }
        });
        fixture.initializeWorkspace();
        fixture.writePackageJson();
        fixture.commit('feat: first commit');
        fixture.tag('1.0.0', 'release 1.0.0');
        fixture.commit('feat: changelog dry-run entry');

        lifecycle = new ChangelogLifecycle();
        loggerInfoStub = sinon.stub(lifecycle.logger, 'info');
        consoleLogStub = sinon.stub(console, 'log');
        writeFileSyncSpy = sinon.spy(fs, 'writeFileSync');
    });

    afterEach(() => {
        fixture.destroy();
        loggerInfoStub.restore();
        consoleLogStub.restore();
        writeFileSyncSpy.restore();
    });

    it('should print changelog to console with relative infile path and not write infile in dryRun mode', async () => {
        const cwd = path.resolve(process.cwd(), workspace);
        const infile = path.join(cwd, defaults.infile as string);
        const initialContent = '# existing changelog\n';
        fs.mkdirSync(path.dirname(infile), { recursive: true });
        fs.writeFileSync(infile, initialContent);
        writeFileSyncSpy.resetHistory();

        const context: CommandContext = {
            options: {
                ...defaults,
                cwd,
                dryRun: true,
                infile: defaults.infile,
                packages: [],
                skip: { changelogLink: true }
            },
            versions: {
                current: '1.0.0',
                next: '1.0.1'
            }
        };

        await lifecycle.run(context);

        expect(fs.readFileSync(infile, 'utf-8')).eq(initialContent);
        expect(writeFileSyncSpy.called).eq(false);

        const infileLog = loggerInfoStub.getCalls().find((call) => String(call.args[0]).includes('CHANGELOG.md'));
        expect(infileLog).to.exist;
        expect(infileLog!.args[0]).eq('CHANGELOG.md:');

        expect(consoleLogStub.called).eq(true);
        const printed = String(consoleLogStub.getCall(0).args[0]);
        expect(printed.trim().length).gt(0);
        expect(printed).to.include('1.0.1');
    });
});
