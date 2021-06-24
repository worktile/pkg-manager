import { CommandModule } from "yargs";
import _ from "lodash";
import { CommandOptions } from "../interface";
import { defaults } from "../defaults";
import { ReleaseHandler } from "../handlers";
import { logger } from "../logger";

export const releaseCommand: CommandModule = {
  command: ["release [releaseAs]"],
  describe:
    "Release package or project contains bump version, changelog, create release branch, push",
  builder: (yargs) => {
    yargs
      .option("skip", {
        alias: "s",
        // choices: ['bump', 'changelog', 'commit', 'branch', 'push'],
        desc: `Map of steps in the release process that should be skipped`,
        default: defaults.skip,
      })
      .option("release-branch-format", {
        desc: `Release branch format`,
        default: defaults.releaseBranchFormat,
      })
      .option("bump-files", {
        default: defaults.bumpFiles,
        desc: `List of files in the release bump process`,
        array: true,
      })
      .option("preset", {
        default: defaults.preset,
        desc: `Commit message guideline preset, see https://github.com/conventional-changelog/conventional-changelog`,
        string: true,
      })
      .option("commit-all", {
        alias: "a",
        default: defaults.commitAll,
        desc: `Commit all staged changes, not just files affected by wpm`,
        boolean: true,
      })
      .option("infile", {
        alias: "i",
        describe: "Read the CHANGELOG from this file",
        default: defaults.infile,
      });

    return yargs;
  },
  handler: async (argv: any) => {
    if (!_.isObject(argv.skip)) {
      return logger.warn(
        `--skip args(${argv.skip}) is invalid, please use --skip.bump --skip.changelog`
      );
    }
    const options: CommandOptions = {
      dryRun: argv.dryRun,
      skip: argv.skip,
      defaultBranch: argv.defaultBranch,
      allowBranch: argv.allowBranch,
      releaseBranchFormat: argv.releaseBranchFormat,
      releaseAs: argv.releaseAs,
      bumpFiles: argv.bumpFiles,
      issueUrlFormat: argv.issueUrlFormat,
      preset: argv.preset,
      commitAll: argv.commitAll,
      hooks: argv.hooks,
      infile: argv.infile,
      tagPrefix: argv.tagPrefix,
      cwd: defaults.cwd,
    };
    const handler = new ReleaseHandler(options);
    await handler.start().catch((error) => {
      logger.error(error);
    });
  },
};
