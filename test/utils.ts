import * as NodeStatic from "node-static";
import * as fs from "fs-extra";
import puppeteer from "puppeteer";
import * as http from "http";
import * as Mocha from "mocha";
import _ from "lodash"; // eslint-disable-line
const TEST_ON_DEV_BUILD = !!process.env["TEST_ON_DEV_BUILD"];
const PORT = TEST_ON_DEV_BUILD ? 4000 : 40001;
export function setupServer(buildDir: string): Promise<http.Server | undefined> {
  if (TEST_ON_DEV_BUILD) return Promise.resolve(undefined);
  let staticFileServer = new NodeStatic.Server(buildDir);
  return new Promise<http.Server>((resolve, reject) => {
    var server = http
      .createServer(function(request, response) {
        request
          .addListener("end", function() {
            staticFileServer.serve(request, response);
          })
          .resume();
      })
      .listen(PORT, "localhost", () => {
        resolve(server);
      })
      .on("error", e => reject(e));
  });
}

export function wait(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}
//@ts-ignore ignore unused warning
export async function inspectLive(mocha: Mocha.ISuiteCallbackContext) {
  const waitFor = 9999999;
  mocha.timeout(waitFor);
  console.info(`Go to http://localhost:${PORT}?noExternalServices=true`);
  await wait(waitFor);
}
export async function setup(ctx: Mocha.Context, buildDir: string) {
  ctx.timeout(10000);
  const server = await setupServer(buildDir);
  await fs.emptyDir("./test/screenshots");
  const browser = await puppeteer.launch({
    args: [process.env["NO_SANDBOX"] ? "--no-sandbox" : ""]
  });
  return { server, browser };
}
export async function destroy(browser: puppeteer.Browser, server?: http.Server) {
  if (browser) await browser.close();
  if (server) server.close();
}
export async function getPage(browser: puppeteer.Browser, path: string) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/${path}?noExternalServices=true`);

  await Promise.race([
    new Promise((_resolve, reject) => {
      page.once("error", err => {
        reject(err);
      });
      page.once("pageerror", err => {
        reject(err);
      });
    }),
    page.waitForFunction(() => "yasgui" in window || "yasr" in window || "yasqe" in window || "stories" in window)
  ]);
  page.on("error", e => {
    console.error("Error on page: ", e);
  });
  return page;
}
export function makeScreenshot(page: puppeteer.Page, name?: string) {
  return page.screenshot({ type: "png", path: "./test/screenshots/" + (name || +Date.now()) + ".png" });
}
export async function closePage(suite: Mocha.Suite, page: puppeteer.Page) {
  const state = suite.ctx.currentTest?.state || "unknown";
  const title = suite.ctx.currentTest?.fullTitle() || "unknown";
  await makeScreenshot(page, `${state}-${_.kebabCase(title)}`);
  if (page) await page.close();
}
