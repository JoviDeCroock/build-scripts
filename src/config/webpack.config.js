const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackEsmodulesPlugin = require('webpack-module-nomodule-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const modernTerser = new TerserPlugin({
  cache: true,
  parallel: true,
  sourceMap: true,
  terserOptions: {
    compress: {
      keep_infinity: true,
      pure_getters: true,
      passes: 10,
    },
    output: {
      // By default, Terser wraps function arguments in extra parens to trigger eager parsing.
      wrap_func_args: false,
    },
    ecma: 8,
    safari10: true,
    toplevel: true,
  }
});

const makeConfig = (isProduction, mode) => {
  const plugins = [
    // TODO: allow templating and default
    new HtmlWebpackPlugin({ inject: true, template: './index.html' }),
    new webpack.DefinePlugin({
      // TODO: more env vars
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'prodcution' : 'development'),
    }),
  ];

  if (isProduction) {
    plugins.push(new HtmlWebpackEsmodulesPlugin(mode))
  } else {
    plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  // Return configuration
  return {
    mode: isProduction ? 'production' : 'development',
    entry: mode === 'legacy' ? {
      fetch: 'whatwg-fetch',
      main: './src/index.tsx',
    } : {
      main: './src/index.tsx'
    },
    context: path.resolve(__dirname, './'),
    stats: 'normal',
    devtool: isProduction ? '' : 'eval-source-map',
    devServer: {
      contentBase: path.join(__dirname, 'dist'),
      host: 'localhost',
      port: 3000,
      historyApiFallback: true,
      hot: true,
      inline: true,
      publicPath: '/',
      clientLogLevel: 'none',
      open: true,
      overlay: true,
    },
    output: {
      chunkFilename: `[name]-[contenthash]${mode === 'modern' ? '.modern.js' : '.js'}`,
      filename: isProduction ? `[name]-[contenthash]${mode === 'modern' ? '.modern.js' : '.js'}` : `[name]${mode === 'modern' ? '.modern.js' : '.js'}`,
      path: path.resolve(__dirname, './dist'),
      publicPath: '/',
    },
    optimization: {
      minimizer: mode === 'legacy' ? undefined : [modernTerser],
    },
    plugins,
    resolve: {
      mainFields: ['module', 'main', 'browser'],
      extensions: [".tsx", ".ts", ".mjs", ".js", ".jsx"],
      alias: {
        ...(mode === 'modern' ? { 'url': 'native-url' } : {})
      },
    },
    module: {
      rules: [
        {
          // This is to support our `graphql` dependency, they expose a .mjs bundle instead of .js
          // Sneaky sneaky sir graphql.
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        },
        {
          // Pre-compile graphql strings.
          test: /\.(graphql|gql)$/,
          exclude: /node_modules/,
          loader: 'graphql-tag/loader'
        },
        {
          test: /\.(png|jpe?g|gif)$/,
          use: [
            {
              loader: 'file-loader',
              options: {},
            },
          ],
        },
      ],
    },
  };
};
