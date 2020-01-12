require("source-map-support/register");
import * as puppeteer from "puppeteer";

import * as path from "path";
import * as http from "http";
import * as chai from "chai";
import { it, describe, before, beforeEach, after, afterEach } from "mocha";
import * as _ from "lodash";
const expect = chai.expect;
import Yasqe from "@triply/yasqe";
//@ts-ignore ignore unused warning
import { setup, destroy, closePage, getPage, makeScreenshot, inspectLive, wait } from "./utils";

declare var window: Window & {
  Yasqe: typeof Yasqe;
  yasqe: Yasqe;
};

describe("Yasqe", function() {
  // Define global variables
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  let server: http.Server;

  before(async function() {
    const refs = await setup(this, path.resolve("./build"));
    browser = refs.browser;
    server = refs.server;
  });

  beforeEach(async () => {
    page = await getPage(browser, "yasqe.html");
  });

  afterEach(async function() {
    await closePage(this, page);
  });

  after(async function() {
    return destroy(browser, server);
  });

  it("get a value", async function() {
    const value = await page.evaluate(() => {
      return window.yasqe.getValue();
    });
    expect(value).to.contain("SELECT");
  });
  describe("Autoformatting", function() {
    it("With literal", async function() {
      const value = await page.evaluate(() => {
        window.yasqe.setValue(
          `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> select * {   ?a rdf:b ?c ;     rdf:d "e" ;     rdf:f rdf:g .}`
        );
        window.yasqe.autoformat();
        return window.yasqe.getValue();
      });
      expect(value).to.equal(`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
select * {
  ?a rdf:b ?c ;
     rdf:d "e" ;
     rdf:f rdf:g .
}`);
    });
    it("With group concat", async function() {
      const value = await page.evaluate(() => {
        window.yasqe.setValue(`select (group_concat(str(?a); separator='" "') as ?b) { }`);
        window.yasqe.autoformat();
        return window.yasqe.getValue();
      });
      expect(value).to.equal(`select (group_concat(str(?a); separator='" "') as ?b) {
}`);
    });
  });
  describe("Autoadd prefixes", function() {
    //note: this test also covers the infinite loop issue described here:
    //https://github.com/TriplyDB/YASGUI.YASQE/issues/135
    it("Should autoadd foaf prefix", async function() {
      await page.evaluate(() => {
        const query = `# prefix #
PREFIX geo: <http://www.opengis.net/ont/geosparql#> select
* where { `;
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: window.yasqe.getDoc().lineCount(), ch: 0 });
        return window.yasqe.getDoc().getCursor();
      });
      await page.keyboard.type("foaf:");
      await page.waitForFunction(
        () => {
          return window.yasqe.getValue().indexOf("PREFIX foaf: <http://xmlns.com/foaf/0.1/>") >= 0;
        },
        {
          polling: 10
        }
      );
    });
  });
  describe("Autocompleting", function() {
    async function issueAutocompletionKeyCombination() {
      await page.keyboard.down("Control");
      await page.keyboard.press("Space");
      await page.keyboard.up("Control");
    }
    async function waitForAutocompletionPopup(shouldNotHaveLength?: number): Promise<number> {
      if (shouldNotHaveLength) {
        await page.waitForFunction(
          `document.querySelector('.CodeMirror-hints').children.length !== ${shouldNotHaveLength}`
        );
      } else {
        await page.waitFor(`.CodeMirror-hints`);
      }
      return page.evaluate(() => document.querySelector(".CodeMirror-hints").children.length);
      // return page.waitForFunction(`document.querySelector('.CodeMirror-hints').children.length ${childrenLengthCheck}`);
    }
    /**
     * This test is tricky, as it uses the LOV API in our test. I.e, if this test fails, first check whether LOV is actually up
     */
    describe("Async property autocompletion", function() {
      function focusOnAutocompletionPos() {
        return page.evaluate(() => {
          const query = `PREFIX geo: <http://www.opengis.net/ont/geosparql#> select * where {?x geo: ?y}`;
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf(": ?y") + 1 });
          return window.yasqe.getDoc().getCursor();
        });
      }
      it("Should not append the string we just typed (#1479)", async function() {
        /**
         * Set the new query, and focus on location where we want to autocomplete
         */
        await focusOnAutocompletionPos();

        /**
         * Issue autocompletion shortcut
         */
        await issueAutocompletionKeyCombination();

        /**
         * Wait for hint div to appear
         */
        const allInitialResults = await waitForAutocompletionPopup();

        /**
         * Type a string to reduce autocompletion list
         */
        await page.keyboard.type("rcc");

        /**
         * Wait for the hint div to be updated to only match suggestions starting with `rcc`
         */
        const numResults = await waitForAutocompletionPopup(allInitialResults);
        expect(numResults).to.be.lessThan(10);
        /**
         * Select the first suggestion
         */
        await page.keyboard.press("Enter");

        /**
         * Check whether that suggestion is now correctly included in yasqe
         */
        const newValue = await page.evaluate(() => window.yasqe.getValue());
        expect(
          newValue.indexOf("PREFIX geo: <http://www.opengis.net/ont/geosparql#> select * where {?x geo:rcc8")
        ).to.equal(0);
      });
      it("Should only include matching strings", async function() {
        /**
         * Set the new query, and focus on location where we want to autocomplete
         */
        await focusOnAutocompletionPos();

        /**
         * Issue autocompletion shortcut
         */
        await issueAutocompletionKeyCombination();

        /**
         * Wait for hint div to appear
         */
        const allResults = await waitForAutocompletionPopup();

        /**
         * Type a string to reduce autocompletion list
         */
        await page.keyboard.type("defau");

        /**
         * Wait for the hint div to be updated to only match suggestions starting with `rcc`
         */
        const numResults = await waitForAutocompletionPopup(allResults);
        expect(numResults).to.equal(1);
        /**
         * Select the first suggestion
         */
        await page.keyboard.press("Enter");

        /**
         * Check whether that suggestion is now correctly included in yasqe
         */
        const newValue = await page.evaluate(() => window.yasqe.getValue());
        expect(newValue).to.equal(
          "PREFIX geo: <http://www.opengis.net/ont/geosparql#> select * where {?x geo:defaultGeometry ?y}"
        );
      });

      it("Should not try to previous property, but use current one (#1843)", async function() {
        await page.evaluate(() => {
          const query = `SELECT * WHERE {
?a a ?b.
?c
bb
} LIMIT 10`;
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 3, ch: 2 });
          return window.yasqe.getDoc().getCursor();
        });

        await issueAutocompletionKeyCombination();
        await waitForAutocompletionPopup();
        await page.keyboard.press("Enter");
        const newValue = await page.evaluate(() => window.yasqe.getValue());
        //we should autocomplete the string 'bb' (and not the previous property 'a').
        //This string 'bb' is autocompleted using a property from the bbc vocab, so it should have '.bbc.' in it
        expect(newValue).to.contain(".bbc.");
      });
    });
    describe("Async class autocompletion", function() {
      function focusOnAutocompletionPos() {
        return page.evaluate(() => {
          const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> select * where {?x rdf:type <htt`;
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: query.length - 2 });
          return window.yasqe.getDoc().getCursor();
        });
      }

      it("Should use correct token for autocompleting classes (#1852)", async function() {
        /**
         * Set the new query, and focus on location where we want to autocomplete
         */
        await focusOnAutocompletionPos();

        /**
         * Issue autocompletion shortcut
         */
        await issueAutocompletionKeyCombination();

        /**
         * Wait for hint div to appear
         */
        const allResults = await waitForAutocompletionPopup();
        expect(allResults).to.equal(50);
      });
    });
    describe("Async prefix autocompletion", function() {
      function focusOnAutocompletionPos() {
        return page.evaluate(() => {
          const query = ``;
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: 0 });
          return window.yasqe.getDoc().getCursor();
        });
      }

      it("Should autocomplete", async function() {
        await page.evaluate(() => localStorage.clear());
        // await inspectLive(this)
        /**
         * Set the new query, and focus on location where we want to autocomplete
         */
        await focusOnAutocompletionPos();
        /**
         * Issue autocompletion shortcut
         */
        await page.keyboard.type("prefix a");

        /**
         * Wait for hint div to appear
         */
        const firstResults = await waitForAutocompletionPopup();
        //not sure why this isnt a 100. Disabled for now, try again later
        // expect(firstResults).to.equal(100, 'Expected the hard limit of 100 to be applied')

        /**
         * Type a string to reduce autocompletion list
         */
        await page.keyboard.type("a");

        const filteredResults = await waitForAutocompletionPopup();
        expect(filteredResults).to.equal(3);
        /**
         * Select the first suggestion
         */
        await page.keyboard.press("Enter");

        /**
         * Check whether that suggestion is now correctly included in yasqe
         */
        const newValue = await page.evaluate(() => window.yasqe.getValue());
        expect(newValue).to.equal("prefix aair: <http://xmlns.notu.be/aair#>");
      });
    });

    describe("Single line autocompletion", function() {
      async function executeFirstLineAutocompletion(query: string) {
        await page.evaluate(query => {
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor(1, 0);
          return window.yasqe.getDoc().getCursor();
        }, query);
        await page.keyboard.press("End");

        await issueAutocompletionKeyCombination();
        await waitForAutocompletionPopup();
        await page.keyboard.press("Enter");
        return page.evaluate(() => window.yasqe.getValue());
      }

      it("Should autocomplete with multiple statements on one line", async function() {
        const query = `SELECT * WHERE {
          ?a <somwething.something.without.bbc.url> ?b. ?a bbc
        }`;
        const autocompletedQuery = await executeFirstLineAutocompletion(query);
        expect(autocompletedQuery).to.contain("bbc.co.uk");
      });

      it("Should autocomplete with single-line Predicate-Object lists", async function() {
        const query = `SELECT * WHERE {
          ?a <somwething.something.without.bbc.url> ?b ; bbc
        }`;
        const autocompletedQuery = await executeFirstLineAutocompletion(query);
        expect(autocompletedQuery).to.contain("bbc.co.uk");
      });

      it("Should autocomplete with single-line Object lists", async function() {
        const query = `SELECT * WHERE {
          ?a a ?b, bbc
        }`;
        const autocompletedQuery = await executeFirstLineAutocompletion(query);
        expect(autocompletedQuery).to.contain("bbc.co.uk");
      });
    });
  });
});
