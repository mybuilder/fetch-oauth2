var babel = require('babel');
var wallabyWebpack = require('wallaby-webpack');
var webpack = require('webpack');
var wallabyPostprocessor = wallabyWebpack({
    resolve: {
        modulesDirectories: ['node_modules', "src", "spec-tools"],
        extensions: ['', '.js', '.jsx']
    },
    module: {
        loaders: [
            {test: /\.json$/, loader: "json-loader"}
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        })
    ]
});

module.exports = function (wallaby) {
    return {
        files: [
            {pattern: 'node_modules/babel-core/browser-polyfill.js', instrument: false},
            {pattern: 'src/**/*.js', load: false},
            {pattern: 'test_server_port.json', load: false}
        ],

        tests: [
            {pattern: 'spec/**/*Spec.js', load: false}
        ],

        compilers: {
            '**/*.js': wallaby.compilers.babel({
                babel: babel,
                // https://babeljs.io/docs/usage/experimental/
                stage: 0
            })
        },

        env: {
            type: "browser",
            params: {
                runner: '--local-to-remote-url-access=true --web-security=false'
            }
        },

        testFramework: 'mocha',

        postprocessor: wallabyPostprocessor,

        bootstrap: function () {
            // required to trigger tests loading
            window.__moduleBundler.loadTests();
        }
    };
};
