import path from 'path';
import fileName from 'file-name';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import getClientBundles from './getClientBundles';
import createApplicationConfig from './createApplicationConfig';
import mapExtensionsToRegExp from './mapExtensionsToRegExp';
import resolve from 'resolve';

export default function createClientConfig(options) {
  const {env, root, config: {src, dest, scripts: {bundles, vendors}, styles: {extensions}}} = options;

  const config = createApplicationConfig(options);

  //configure all the bundles
  const clientBundles = getClientBundles(bundles);
  const entries = clientBundles.reduce((accum, bundle) => {
    const dirname = path.dirname(bundle);
    const basename = fileName(bundle);
    return {
      ...accum,
      [path.join(dirname, basename)]: bundle
    };
  }, {});

  //create a common.js bundle for modules that are shared across multiple bundles
  if (clientBundles.length > 1) {
    config.plugins = config.plugins.concat([
      new webpack.optimize.CommonsChunkPlugin({
        name: 'common',
        filename: env === 'production' ? '[name].js' : '[name].js', //FIXME: '[name].[chunkhash].js' in prod
        chunks: clientBundles, //exclude modules from the vendor chunk
        minChunks: clientBundles.length //modules must be used across all the chunks to be included
      })
    ]);
  }//TODO: what about for a single page app where require.ensure is used - I want a common stuff for all chunks in the main entry point

  //use vendor modules from the vendor bundle
  if (vendors.length > 0) {
    //chose DLLPlugin for long-term-caching based on https://github.com/webpack/webpack/issues/1315
    config.plugins = config.plugins.concat([
      new webpack.DllReferencePlugin({
        context: path.resolve(root, dest),
        manifest: require(path.resolve(root, dest, 'vendor-manifest.json'))
      })
    ]);
  }

  //stylesheets
  config.sassLoader = {
    importer: function(url, prev, done) {
      prev = prev === 'stdin' ? process.cwd()+'/.' : prev; //FIXME: pending https://github.com/jtangelder/sass-loader/issues/234
      resolve(url, {

        basedir: path.dirname(prev),

        //look for SASS and CSS files
        extensions: ['.scss', '.sass', '.css'],

        //allow packages to define a SASS entry file using the "main.scss", "main.sass" or "main.css" keys
        packageFilter: function(pkg) {
          pkg.main = pkg['main.scss'] || pkg['main.sass'] || pkg['main.css'] || pkg['style'];
          return pkg;
        }

      }, (err, file) => {
        if (err) {
          done(err);
        } else {
          done({file: file});
        }
      });
    }
  };
  config.module.loaders = config.module.loaders.concat([
    {
      test: mapExtensionsToRegExp(extensions),
      loader: ExtractTextPlugin.extract('style-loader', ['css?sourceMap', 'resolve-url?sourceMap', 'sass?sourceMap'])
    },
    {
      test: /\.jpe?g$|\.gif$|\.png$|\.svg$|\.woff$|\.ttf$/,
      loader: 'file'
    }
  ]);
  config.plugins = config.plugins.concat([
    new ExtractTextPlugin('[name].css', {allChunks: true}) //TODO: [contenthash]
  ]);

  return {
    ...config,

    target: 'web',
    devtool: env === 'production' ? 'hidden-source-map' : 'cheap-module-eval-source-map',

    entry: entries,
    context: path.resolve(root, src),

    output: {
      path: path.resolve(root, dest),
      filename: env === 'production' ? '[name].js' : '[name].js' //FIXME: '[name].[chunkhash].js' in prod
    }

  };
}
