const LiveReloadPlugin = require("webpack-livereload-plugin");
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as webpack from "webpack";
import * as path from "path";
const isProd = process.env.NODE_ENV === "production";
const isDev = !isProd;
const bgImage = require("postcss-bgimage");
import * as autoprefixer from "autoprefixer";
import * as MiniCssExtractPlugin from "mini-css-extract-plugin";
var TerserPlugin = require("terser-webpack-plugin");
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";

import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
export const analyzeBundle = process.env["ANALYZE_BUNDLE"] === "true";


const plugins: any[] = [
  new webpack.DefinePlugin({
    __DEVELOPMENT__: isDev
  })
];
const defaultEndpoint = "https://dbpedia.org/sparql";
const corsProxy = "";
function getAliasFor(packageName: "yasgui" | "yasr" | "yasqe" | "utils") {
  const fullPackageName = packageName === "utils" ? "@triply/yasgui-utils" : `@triply/${packageName}`;
  const packagePath = path.resolve(__dirname, "../packages", packageName, "src");
  return {
    [`${fullPackageName}$`]: path.resolve(packagePath, "index.ts")
  };
}

export const indexPage: HtmlWebpackPlugin.Options = {
  filename: "index.html",
  template: path.resolve(__dirname, "pages/index.html"),
  templateParameters: {
    links: [
      { href: "yasgui.html", text: "Yasgui" },
      { href: "yasqe.html", text: "Yasqe" },
      { href: "yasr.html", text: "Yasr" }
    ]
  },
  inject: false
};
export function getLinks(active?: "Yasgui" | "Yasqe" | "Yasr") {
  return [
    { href: "yasgui.html", text: "Yasgui", className: active === "Yasgui" && "active" },
    { href: "yasqe.html", text: "Yasqe", className: active === "Yasqe" && "active" },
    { href: "yasr.html", text: "Yasr", className: active === "Yasr" && "active" }
  ];
}
export const htmlConfigs: { [key: string]: HtmlWebpackPlugin.Options } = {
  index: {
    filename: "index.html",
    template: path.resolve(__dirname, "pages/index.html"),
    templateParameters: {
      links: getLinks(),
      endpoint: defaultEndpoint
    },
    inject: false
  } as HtmlWebpackPlugin.Options,
  yasgui: {
    filename: "yasgui.html",
    template: path.resolve(__dirname, "pages/yasgui.html"),
    templateParameters: {
      links: getLinks("Yasgui"),
      endpoint: defaultEndpoint,
      corsProxy: corsProxy
    },
    chunks: ["Yasqe", "Yasr", "Yasgui"]
  } as HtmlWebpackPlugin.Options,
  yasqe: {
    filename: "yasqe.html",
    template: path.resolve(__dirname, "pages/yasqe.html"),
    templateParameters: {
      links: getLinks("Yasqe"),
      endpoint: defaultEndpoint
    },
    chunks: ["Yasqe"]
  } as HtmlWebpackPlugin.Options,
  yasr: {
    filename: "yasr.html",
    template: path.resolve(__dirname, "pages/yasr.html"),
    templateParameters: {
      links: getLinks("Yasr"),
      endpoint: defaultEndpoint
    },
    chunks: ["Yasqe", "Yasr"]
  } as HtmlWebpackPlugin.Options
};

plugins.push(...Object.values(htmlConfigs).map(c => new HtmlWebpackPlugin(c)));
if (isDev) {
  //ignore these, to avoid infinite loops while watching
  plugins.push(new webpack.WatchIgnorePlugin([/\.js$/, /\.d\.ts$/]));
  plugins.push(new LiveReloadPlugin({ port: 35731 }));
  plugins.push(new webpack.HotModuleReplacementPlugin());
} else {
  plugins.push(
    new MiniCssExtractPlugin({
      moduleFilename: ({ name }: {name:string}) => `${name.toLowerCase()}.min.css`
    } as any)
  );
}
if (analyzeBundle) plugins.push(new BundleAnalyzerPlugin());

export const genericConfig: webpack.Configuration = {
  //We're cannot use all source map implementations because of the terser plugin
  //See https://webpack.js.org/plugins/terser-webpack-plugin/#sourcemap
  devtool: isDev ? "inline-source-map" : "source-map",
  cache: isDev,
  optimization: {
    minimize: true, //If you're debugging the production build, set this to false
    //that'll speed up the build process quite a bit
    minimizer: isDev
      ? []
      : [
          new TerserPlugin({
            sourceMap: true
          }),
          new OptimizeCSSAssetsPlugin({})
        ]
  },
  performance: {
    maxEntrypointSize: 3000000,
    maxAssetSize: 3000000
  },
  mode: isDev ? "development" : "production",
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.tsx?$/,
        loader: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: ["last 3 versions", "> 1%"]
                  }
                ]
              ],
              plugins: ["@babel/plugin-transform-runtime"]
            }
          },
          {
            loader: "ts-loader",
            options: {
              configFile: `tsconfig.json`
            }
          }
        ]
      },
      {
        test: /\.js$/,
        include: [/query-string/, /strict-uri-encode/, /superagent/, /n3/, /split-on-first/],
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: ["last 3 versions", "> 1%"]
                  }
                ]
              ]
            }
          }
        ]
      },
      {
        test: /\.scss$/,
        use: [
          isDev ? "style-loader" : MiniCssExtractPlugin.loader,
          { loader: "css-loader", options: { importLoaders: 2 } },
          {
            loader: "postcss-loader",
            options: { plugins: [autoprefixer()] }
          },
          "sass-loader"
        ]
      },
      {
        test: /\.js$/,
        exclude: [
          //Exclude source maps for this package. They are incorrect
          /node_modules\/column-resizer/g
        ],
        use: ["source-map-loader"],
        enforce: "pre"
      },
      {
        test: /\.css$/,
        use: [
          isDev ? "style-loader" : MiniCssExtractPlugin.loader,
          { loader: "css-loader", options: { importLoaders: 1 } },
          {
            loader: "postcss-loader",
            options: { plugins: () => [bgImage({ mode: "cutter" })] }
            // options: { }
          }
        ]
      }
    ]
  },
  resolve: {
    modules: [
      path.resolve(__dirname, "./../node_modules"),
      path.resolve(__dirname, "./../packages/yasgui/node_modules"),
      path.resolve(__dirname, "./../packages/yasqe/node_modules"),
      path.resolve(__dirname, "./../packages/yasr/node_modules"),
      path.resolve(__dirname, "./../packages/utils/node_modules")
    ],
    alias: {
      ...getAliasFor("yasgui"),
      ...getAliasFor("yasr"),
      ...getAliasFor("yasqe"),
      ...getAliasFor("utils")
    },
    extensions: [".json", ".js", ".ts", ".scss"]
  },
  plugins: plugins
};

const config: webpack.Configuration = {
  ...genericConfig,
  output: {
    path: path.resolve("build"),
    publicPath: "/",
    filename: function(chunkData: any) {
      const ext = `${isDev ? "" : ".min"}.js`;
      return `${chunkData.chunk.name.toLowerCase()}${ext}`;
    } as any,
    library: "[name]",
    libraryExport: "default",
    libraryTarget: "umd",
    umdNamedDefine: true
  },
  entry: {
    Yasgui: [path.resolve(__dirname, "./../packages/yasgui/src/index.ts")],
    Yasqe: path.resolve(__dirname, "./../packages/yasqe/src/index.ts"),
    Yasr: path.resolve(__dirname, "./../packages/yasr/src/index.ts")
  }
};

export default config;
