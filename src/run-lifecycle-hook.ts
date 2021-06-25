/**
 * @license
 * Copyright Worktile Inc All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/worktile/pkg-manager/blob/master/LICENSE
 */
import { shell } from "@docgeni/toolkit";
import { Hooks, CommandOptions } from "./interface";
import { logger } from "./logger";

export interface LifecycleHookParams {
  version: string;
}

async function runLifecycleHook(
  name: string,
  options: CommandOptions,
  params?: LifecycleHookParams
) {
  const command: string = options.hooks ? options.hooks[name] : "";
  if (command) {
    // command "echo {{version}}" => "echo 1.0.1"
    let finalCommand = command;
    if (params && params.version) {
      finalCommand = command.replace("{{version}}", params.version);
    }
    logger.info(`running hook ${name} (command: ${finalCommand})`);
    if (!options.dryRun) {
      shell.execSync(finalCommand);
    }
    logger.success(`execute hook ${name} (command: ${finalCommand}) success`);
  }
}

export { runLifecycleHook };
