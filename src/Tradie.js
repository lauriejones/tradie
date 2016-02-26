import yargs from 'yargs';
import {EventEmitter} from 'events';
import getConfig from './lib/getConfig';
import loadPlugins from './lib/loadPlugins';

//import * as initCommand from './cmd/init';
import * as cleanCommand from './cmd/clean';
import * as lintCommand from './cmd/lint';
import * as bundleCommand from './cmd/bundle';
import * as bundleScriptsCommand from './cmd/bundle-scripts';
import * as bundleStylesCommand from './cmd/bundle-styles';
import * as buildCommand from './cmd/build';
import * as testCommand from './cmd/test';

export default function() {
  return new Promise((resolve, reject) => {

    const environment = process.env.NODE_ENV || 'development';

    const emitter = new EventEmitter();

    const argParser = yargs
      .usage('\nUsage: \n  $0 <command> [options]')
      .demand(1)
      .strict()
      .help('h')
      .alias('h', 'help')
      .showHelpOnFail()
    ;

    //load the config
    let config = {};
    try {
      config = getConfig(environment);
    } catch (error) {
      return reject(error);
    }

    const tradie = {

      env: environment,

      on: (...args) => emitter.on(...args),

      once: (...args) => emitter.once(...args),

      off: (...args) => emitter.off(...args),

      /**
       * Register a new command
       * @param   {object}    command
       * @param   {string}    command.name
       * @param   {string}    command.desc
       * @param   {function}  command.hint
       * @param   {function}  command.exec
       * @returns {Runner}
       */
      cmd: (command) => {

        const name = command.name;

        argParser.command(
          command.name,
          command.desc,
          command.hint,
          argv => {

            try {

              const args = {
                ...argv,
                env: environment
              };

              emitter.emit('command.started', {name, args, config});
              Promise.resolve(command.exec({args, config, emitter}))
                .then(
                  code => {
                    emitter.emit('command.finished', {name, args, config, code});
                    resolve(code);
                  },
                  error => reject(error)
                )
              ;

            } catch (error) {
              reject(error);
            }

          }
        );

        return tradie;
      }

    };

    //load the commands
    tradie
      //.cmd(initCommand)
      .cmd(cleanCommand)
      .cmd(lintCommand)
      .cmd(bundleCommand)
      .cmd(bundleScriptsCommand)
      .cmd(bundleStylesCommand)
      .cmd(buildCommand)
      .cmd(testCommand)
    ;

    //log each event
    const oldEmitterEmit = emitter.emit;
    emitter.emit = (...args) => {
      //console.log('tradie:', args);
      return oldEmitterEmit.apply(emitter, args);
    };

    //load the plugins
    loadPlugins(config.plugins, tradie)
      .then(() => {

        //parse the command line arguments and run the appropriate command
        argParser
          .option('v', {
            alias: 'verbose',
            default: false
          })
          .argv
        ;

      })
      .catch(reject)
    ;

  });
}
