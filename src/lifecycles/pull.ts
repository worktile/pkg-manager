// import { Lifecycle } from './lifecycle';
// import { CommandContext } from '../interface';

// export class PullLifecycle extends Lifecycle {
//     async run(context: CommandContext): Promise<void> {
//         if (context.options.skip.pull) {
//             return;
//         }
//         const defaultBranch = context.options.defaultBranch;
//         this.logger.info(`pulling ${defaultBranch} from remote`);

//         if (!context.options.dryRun) {
//             await context.git.pull(undefined, defaultBranch);
//         }
//     }
// }
