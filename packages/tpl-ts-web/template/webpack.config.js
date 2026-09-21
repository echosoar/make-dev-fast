const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      library: {
        name: 'MyLibrary',
        type: 'umd',
      },
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        title: 'TypeScript Web Library Demo',
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      hot: true,
      open: true,
      port: 3000,
      compress: true,
      historyApiFallback: true,
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
  };
};