import path from 'path';
import every from 'lodash.every';

import runWebpack from './runWebpack';

import getClientBundles from './configuration/getClientBundles';
import createVendorConfig from './configuration/createVendorConfig';
import createClientConfig from './configuration/createClientConfig';

import getServerBundles from './configuration/getServerBundles';
import createServerConfig from './configuration/createServerConfig';

/**
 * Create script bundles
 *
 * @param {object}        config
 * @param {string}        [config.src]       The source directory
 * @param {string}        [config.dest]      The destination directory
 * @param {array}         [config.bundles]
 * @param {array}         [config.vendor]
 * @param {array}         [config.loaders]
 * @param {array}         [config.plugins]
 * @param {array}         [config.extensions]
 *
 * @param {object}        args
 * @param {string}        [args.env]
 * @param {string}        [args.watch]
 *
 * @param {function}      emitter
 */
export default function(tradie) {
  const {env, args: {watch}, config: {src, dest, scripts: {bundles, vendors}}, onChange} = tradie;

  const promises = [];
  const clientBundles = getClientBundles(bundles);
  const serverBundles = getServerBundles(bundles);

  const afterCompile = (err, stats) => {

    if (err) {
      //FIXME:
      console.log(err);
      console.log(stats);
      return;
    }

    //emit synthetic (cause webpack) end of bundling events for script bundles

    let scriptCount = 0;
    let scriptTotalSize = 0;
    stats.assets
      .filter(asset => path.extname(asset.name) === '.js')
      .forEach(asset => {

        scriptCount += 1;
        scriptTotalSize += asset.size;

        tradie.emit('scripts.bundle.finished', {
          src: path.join(src, asset.name),
          dest: path.join(dest, asset.name),
          size: asset.size
        });

      })
    ;

    //FIXME: fires too many times when both server and client are built
    tradie.emit('scripts.bundling.finished', {
      src,
      dest,
      count: scriptCount,
      time: stats.time,
      size: scriptTotalSize,
      errors: stats.errors
    });

  };

  const createVendorBundle = () => {
    const vendorConfig = createVendorConfig(
      {...tradie, onChange}
    );
    return runWebpack(vendorConfig, {}, afterCompile);
  };

  const createClientBundle = () => {
    const clientConfig = createClientConfig(
      {...tradie, onChange}
    );
    return runWebpack(clientConfig, {watch}, afterCompile);
  };

  const createServerBundle = () => {
    const serverConfig = createServerConfig(
      {...tradie, onChange}
    );
    return runWebpack(serverConfig, {watch}, afterCompile);
  };

  if (clientBundles.length > 0) {
    if (vendors.length > 0) {
      promises.push(
        createVendorBundle()
          .then(code => code === 0 ? createClientBundle() : -1)
      );
    } else {
      promises.push(createClientBundle());
    }
  }

  if (serverBundles.length > 0) {
    promises.push(createServerBundle());
  }

  if (clientBundles.length === 0 && serverBundles.length === 0) {
    //FIXME: emit `scripts.bundling.finished` when 0 scripts were bundled
  }

  return Promise.all(promises)
    .then(codes => every(codes, code => code === 0) ? 0 : -1)
  ;
}
