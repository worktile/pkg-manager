import simpleGit, { SimpleGit } from "simple-git/promise";
import fs from "fs";
import path from "path";
import { protocol, gitProviders, buildGitProvider } from "./git-provider";
import chalk from "chalk";
import inquirer from "inquirer";
import semver from "semver";
import { logger } from "../logger";
import { shell, fs as fsExtra } from "@docgeni/toolkit";

export interface GitRepositoryOptions {
  protocol?: protocol;
  provider?: gitProviders;
  name: string;
  organizationOrUser?: string;
}

export const defaultOptions = {
  protocol: "ssh",
  provider: "github",
  organizationOrUser: "atinc",
};

export async function gitPublish(
  source: string,
  options: GitRepositoryOptions,
  dryRun?: boolean
) {
  if (!source) {
    logger.warn(`source can't been null`);
    return;
  }
  if (!options.name) {
    logger.warn(`name can't been null`);
    return;
  }
  options = Object.assign({}, defaultOptions, options);
  const sourcePath = path.resolve(process.cwd(), source);
  const tmpPath = path.resolve(process.cwd(), ".tmp");
  try {
    const packageJsonFilePath = `${sourcePath}/package.json`;
    const packageJsonFileExists = fs.existsSync(packageJsonFilePath);
    if (!packageJsonFileExists) {
      logger.warn(`${packageJsonFilePath} file is not exists`);
      return;
    }
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonFilePath, "utf8")
    ) as any;

    const gitProvider = buildGitProvider(options.provider);
    const gitOrigin = gitProvider.origin(
      options.protocol,
      options.organizationOrUser,
      options.name
    );

    const questions = [
      {
        name: "confirm",
        type: "confirm",
        message: `The current operation will cover the ${chalk.red(
          `${gitOrigin}`
        )} repository.\n Do you want to continue?`,
      },
    ];
    const { confirm } = await inquirer.prompt(questions);
    if (!confirm) {
      logger.warn("publish has been cancelled");
      return;
    }

    logger.info(`copy file to ${tmpPath} ...`);
    shell.cp(`${sourcePath}/**/**`, tmpPath);
    logger.success(`copy files success`);

    // use call for test
    const git: SimpleGit = simpleGit.call(simpleGit, tmpPath);
    if (!dryRun) {
      await git.init();
      await git.addRemote(
        "origin",
        gitProvider.origin(
          options.protocol,
          options.organizationOrUser,
          options.name
        )
      );
      await git.add("./*");
      await git.commit(`chore(release): publish ${packageJson.version}`);
    }
    logger.success(`git commit success`);

    const tags = (await git.listRemote(["--tags"])) || "";
    const lastTag = tags.trim().split("\n").pop().split("/").pop().toString();

    if (!semver.valid(lastTag) || semver.gt(packageJson.version, lastTag)) {
      logger.info(`push tag ${chalk.green(packageJson.version)} to origin...`);
      if (!dryRun) {
        await git.addTag(packageJson.version);
      }
    } else {
      logger.warn(`${packageJson.version} has been published`);
    }
    if (!dryRun) {
      await git.push("origin", "--tags");
    }
    logger.info(`push master to origin...`);
    if (!dryRun) {
      await git.push("origin", "master", { "-f": true } as any);
    }
    logger.info(`remove tmp folder...`);
    await shell.rm(tmpPath);

    logger.success(`publish success!`);
  } catch (error) {
    await shell.rm(tmpPath);
    console.error(error);
  } finally {
    process.exit();
  }
}
