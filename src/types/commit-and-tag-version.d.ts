declare module 'commit-and-tag-version/lib/latest-semver-tag' {
    export default function latestSemverTag(options?: { tagPrefix?: string }): Promise<string | null>;
}
