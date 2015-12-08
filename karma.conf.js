var webpack = require('webpack');

module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['mocha'],
        files: [
            './node_modules/babel-core/browser-polyfill.js',
            './node_modules/whatwg-fetch/fetch.js',
            './spec/**/*Spec.js'
        ],
        preprocessors: {
            './spec/**/*Spec.js': ['webpack']
        },
        browsers: [
            'PhantomJS',
            'PhantomJS_custom'
        ],

        customLaunchers: {
          'PhantomJS_custom': {
            base: 'PhantomJS',
            options: {
              windowName: 'my-window',
              settings: {
                localToRemoteUrlAccessEnabled: true,
                webSecurityEnabled: false
              }
            }
          }
        },

        webpack: {
            resolve: {
                modulesDirectories: [ './node_modules', './src', './spec' ],
                extensions: [ '', '.js' ]
            },
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        exclude: /node_modules/,
                        loaders: ['babel-loader?optional[]=es7.classProperties&optional[]=runtime']
                    },
                    { test: /\.json$/, loader: "json-loader" }
                ]
            }
        },
        webpackMiddleware: {
            noInfo: true
        },
        reporters: [
            'spec'
        ],
        singleRun: true,
        plugins: [
            require('karma-webpack'),
            require('karma-mocha'),
            require('karma-spec-reporter'),
            require('karma-phantomjs-launcher')
        ]
    });
};
