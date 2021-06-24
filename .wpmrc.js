module.exports = {
    defaultBranch: 'master',
    allowBranch: ['master', 'v0.*'],
    bumpFiles: [
        'package.json',
        'package-lock.json',
        {
            filename: './VERSION.txt',
            type: 'plain-text'
        },
        {
            filename: './src/version.json',
            type: 'json'
        },
        {
            filename: './src/version.ts',
            type: 'code'
        }
    ],
    skip: {
        changelog: true
    },
    commitAll: true,
    hooks: {
        postreleaseBranch: 'git add .'
    }
};
