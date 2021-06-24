import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { defaults } from "../defaults";
import { releaseCommand } from "./release";
import { publishCommand } from "./publish";
import { getConfiguration } from "../configuration";
import { gitPublishCommand } from "./git-publish";

const argv = yargs(hideBin(process.argv))
  .scriptName("wpm")
  .usage("Usage: $0 <release|publish> [options]")
  .option("default-branch", {
    alias: "b",
    choices: ["master", "develop"],
    desc: `Repository's default or base branch, create release based on specify branch`,
    default: defaults.defaultBranch,
    global: true,
  })
  .option("allow-branch", {
    desc: `A whitelist of globs that match git branches where wpm release is enabled.`,
    default: defaults.allowBranch,
    array: true,
    global: true,
  })
  .option("dry-run", {
    boolean: true,
    desc: `See the commands that running wt-release would run`,
    default: defaults.dryRun,
    global: true,
  })
  .option("issue-url-format", {
    default: defaults.issueUrlFormat,
    string: true,
    desc: `A URL representing the issue format (allowing a different URL format to be * swapped in for Github, Gitlab, Bitbucket, etc)`,
  })
  .option("hooks", {
    default: defaults.hooks,
    desc: `Provide hooks to execute for lifecycle events (prerelease, pretag, etc.)`,
  })
  .option("tag-prefix", {
    alias: "t",
    describe: "Set a custom prefix for the git tag to be created",
    type: "string",
    default: defaults.tagPrefix,
  })
  .command(releaseCommand)
  .command(publishCommand)
  .command(gitPublishCommand)
  .demandCommand(1, "must provide a valid command")
  .detectLocale(false)
  .wrap(120)
  .version()
  .showHelpOnFail(false)
  .pkgConf("wpm")
  .config(getConfiguration())
  .help()
  .argv;
