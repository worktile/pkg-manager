// import spec from 'conventional-changelog-config-spec';
// import { CommandOptions } from '../interface';

// module.exports = (args: CommandOptions) => {
//     const defaultPreset = require.resolve('conventional-changelog-conventionalcommits');
//     let preset = args.preset || defaultPreset;
//     if (preset === defaultPreset) {
//         preset = {
//             name: defaultPreset
//         };
//         Object.keys(spec.properties).forEach(key => {
//             if (args[key] !== undefined) preset[key] = args[key];
//         });
//     }
//     return preset;
// };
