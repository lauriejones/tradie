import fs from 'fs';
import path from 'path';
import resolve from 'resolve';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import autoprefixer from 'autoprefixer';
import extensionsToRegex from 'ext-to-regex';
import CheckVersionConflictPlugin from './CheckVersionConflictPlugin';

export default function configureStyleLoader(options, webpackConfig) {
  const {optimize, src, style: {extensions, outputFilename}} = options;

  //configure the style filename
  let filename = optimize ? '[name].[contenthash].css' : '[name].css';
  if (outputFilename) {
    filename = outputFilename;
  }

  webpackConfig.sassLoader = {
    importer: (url, prev, done) => {

      const basedir = path.dirname(prev);

      resolve(url, {

        basedir,

        //look for SASS and CSS files
        extensions,

        //allow packages to define a SASS entry file using the "main.scss", "main.sass" or "main.css" keys
        packageFilter(pkg) {
          pkg.main = pkg['main.scss'] || pkg['main.sass'] || pkg['main.css'] || pkg['style'];
          return pkg;
        }

      }, (resolveError, file) => {
        if (resolveError) {
          return done({file: url}); //if we can't resolve it then let webpack resolve it
        } else {

          if (path.extname(file) === '.css') {
            fs.readFile(file, (readError, data) => {
              if (readError) {
                return done(readError);
              } else {
                return done({file, contents: data.toString()});
              }
            });
          } else {
            return done({file});
          }

        }
      });
    }
  };

  webpackConfig.postcss = [
    autoprefixer({browsers: ['> 4%', 'last 4 versions', 'Firefox ESR', 'not ie < 9']})
    //NOTE: css-loader looks for NODE_ENV=production and performs minification so we don't need cssnano
  ];

  //parse SCSS, @import, extract assets, autoprefix and extract to a separate *.css file
  webpackConfig.module.loaders.push({
    test: extensionsToRegex(extensions),
    loader: ExtractTextPlugin.extract({
      fallbackLoader: 'style-loader',
      loader: [
        `css-loader?-autoprefixer${optimize ? '' : '&sourceMap'}`,
        `postcss-loader${optimize ? '' : '?sourceMap'}`,
        `resolve-url-loader${optimize ? '' : '?sourceMap'}`, //devtool: [inline-]source-map is required for CSS source maps to work
        'sass-loader?sourceMap' //sourceMap required by resolve-url-loader
      ]
    })
  });

  webpackConfig.plugins = webpackConfig.plugins.concat([
    new ExtractTextPlugin({
      //other chunks should have styles in the JS and load the styles automatically onto the page (that way styles make use of code splitting) e.g. https://github.com/facebookincubator/create-react-app/issues/408
      allChunks: false,
      filename
    }),
    new CheckVersionConflictPlugin({
      include: extensionsToRegex(extensions)
    })
  ]);

}
