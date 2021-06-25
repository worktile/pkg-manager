/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */

export type protocol = 'ssh' | 'https';
export type gitProviders = 'github' | 'gitlab';

export abstract class GitProvider {
    host: string;

    constructor(host: string) {
        this.host = host;
    }

    origin(protocol: protocol, organizationOrUser: string, name: string) {
        const protocols = {
            ssh: `git@${this.host}:${organizationOrUser}/${name}.git`,
            https: `https://${this.host}/${organizationOrUser}/${name}`
        };
        if (protocols[protocol]) {
            return protocols[protocol];
        } else {
            throw new Error(`${protocol} is not an protocol`);
        }
    }
}

export class GitHubProvider extends GitProvider {
    constructor() {
        super('github.com');
    }
}

export class GitLabProvider extends GitProvider {
    constructor() {
        super('gitlab.com');
    }
}

export function buildGitProvider(provider: gitProviders) {
    switch (provider) {
        case 'github':
            return new GitHubProvider();
        case 'gitlab':
            return new GitLabProvider();
        default:
            throw new Error(`${provider} provider is not support`);
    }
}
