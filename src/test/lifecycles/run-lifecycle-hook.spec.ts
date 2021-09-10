import { runLifecycleHook } from '../../run-lifecycle-hook';
import sinon, { SinonStub } from 'sinon';
import { shell } from '@docgeni/toolkit';
import { expect } from 'chai';

describe('#run-lifecycle-hook', () => {
    let execSyncStub: sinon.SinonStub;
    beforeEach(() => {
        execSyncStub = sinon.stub(shell, 'execSync');
    });

    afterEach(() => {
        execSyncStub.restore();
    });

    it('should run command success', async () => {
        await runLifecycleHook(
            'postbump',
            {
                hooks: {
                    postbump: 'mycommand {{version}}'
                } as unknown
            },
            { version: '12.0.0' }
        );

        expect(execSyncStub.getCall(0).args[0]).eq(`mycommand 12.0.0`);
    });

    it('should run command with multiple versions', async () => {
        await runLifecycleHook(
            'postbump',
            {
                hooks: {
                    postbump: 'mycommand {{version}} mycommand2 {{version}}'
                } as unknown
            },
            { version: '12.0.0' }
        );

        expect(execSyncStub.getCall(0).args[0]).eq(`mycommand 12.0.0 mycommand2 12.0.0`);
    });
});
