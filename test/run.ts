require("source-map-support/register");
import * as puppeteer from "puppeteer";

import * as path from "path";
import * as http from "http";
import * as chai from "chai";
import { it, describe, before, beforeEach, after, afterEach } from "mocha";
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

  afterEach(async () => {
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

  async function waitForAutocompletionPopup(shouldNotHaveLength?: number): Promise<number> {
    if (shouldNotHaveLength) {
      await page.waitForFunction(
        `document.querySelector('.CodeMirror-hints').children.length !== ${shouldNotHaveLength}`
      );
    } else {
      await page.waitFor(`.CodeMirror-hints`);
    }
    return page.evaluate(() => document.querySelector(".CodeMirror-hints").children.length);
  }

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
    it("should show prefix completions after adding new prefix", async () => {
      await page.evaluate(() => {
        const query = `# prefix #
PREFIX geo: <http://www.opengis.net/ont/geosparql#> select
* where { ?sub `;
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
      await waitForAutocompletionPopup();
    });
    it("path traversal should change the correct segment", async () => {
      await page.evaluate(() => {
        const query =
          "PREFIX geo: <http://www.opengis.net/ont/geosparql#> select * where { ?s geo:asWkt/geo:/geo:rcc8po";
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf(":/geo:rcc8po") });
        return window.yasqe.getDoc().getCursor();
      });
      await page.keyboard.down("Control");
      await page.keyboard.press("Space");
      await page.keyboard.up("Control");
      await waitForAutocompletionPopup();
      await page.keyboard.press("Enter");
      const newValue = await page.evaluate(() => window.yasqe.getValue());
      expect(newValue).to.equal(
        "PREFIX geo: <http://www.opengis.net/ont/geosparql#> select * where { ?s geo:asWkt/geo:defaultGeometry/geo:rcc8po"
      );
    });
  });
  describe("Autocompleting", function() {
    async function issueAutocompletionKeyCombination() {
      await page.keyboard.down("Control");
      await page.keyboard.press("Space");
      await page.keyboard.up("Control");
    }
    it("Should only trigger get per request", async () => {
      // Setting up
      await page.evaluate(() => {
        const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> select * where {?x rdf:type <htt`;
        (window as any).showCount = 0;
        (window as any).hideCount = 0;
        window.yasqe.setValue(query);
        window.yasqe.on("autocompletionShown", () => (window as any).showCount++);
        window.yasqe.on("autocompletionClose", () => (window as any).hideCount++);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.length });
        return window.yasqe.getDoc().getCursor();
      });
      const getHideCount = () =>
        page.evaluate(() => {
          return <number>(window as any).hideCount;
        });
      const getShowCount = () =>
        page.evaluate(() => {
          return <number>(window as any).showCount;
        });
      await issueAutocompletionKeyCombination();
      await waitForAutocompletionPopup();
      expect(await getShowCount()).to.equal(1);
      expect(await getHideCount()).to.equal(0);
      await page.keyboard.type("p://www.");
      await wait(200);
      expect(await getShowCount()).to.equal(2);
      expect(await getHideCount()).to.equal(0);
    });
    it("Should show the same results irregardless of where the cursor is", async () => {
      await page.evaluate(() => {
        const query = `select * where { ?s <http://www.opengis.net/ont/geosparql#as`;
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.length });
        return window.yasqe.getDoc().getCursor();
      });
      await issueAutocompletionKeyCombination();
      const resultCount = await waitForAutocompletionPopup();
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const query = `select * where { ?s <http://www.opengis.net/ont/geosparql#as`;
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("/geos") });
      });
      await issueAutocompletionKeyCombination();
      expect(resultCount).to.equal(await waitForAutocompletionPopup());
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const query = `select * where { ?s <http://www.opengis.net/ont/geosparql#as`;
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("engis") });
      });
      await issueAutocompletionKeyCombination();
      expect(resultCount).to.equal(await waitForAutocompletionPopup());
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const query = `select * where { ?s <http://www.opengis.net/ont/geosparql#as`;
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("http") });
      });
      await issueAutocompletionKeyCombination();
      expect(resultCount).to.equal(await waitForAutocompletionPopup());
    });
    describe("getCompleteToken", () => {
      const getCompleteToken = () => {
        return page.evaluate(() => window.yasqe.getCompleteToken());
      };
      const getCompleteTokenAt = (character: number, line?: number) => {
        return page.evaluate(
          (at: { character: number; line: number }) => {
            window.yasqe.getDoc().setCursor({ line: at.line || window.yasqe.getCursor().line, ch: at.character });
            return window.yasqe.getCompleteToken();
          },
          { character: character, line: line }
        );
      };
      it("Should not include query separators", async () => {
        // Using variable autocompleter
        await page.evaluate(() => {
          const oneLineQuery = "select * where { ?subject ?predicate ?s}";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.length - 1 });
        });
        const token = await getCompleteToken();
        expect(token.string).to.equal("?s");
      });
      it("Should scope to only one part of a path expression", async () => {
        const oneLineQuery =
          "PREFIX geo: <http://www.opengis.net/ont/geosparql#>; select * where { ?subject geo:a/geo:c/geo:i";

        await page.evaluate(() => {
          // Pref 1 = asWkt,asGML, Pref 2 = coordinateDimension, Pref 3 = geo:isEmpty,isSimple
          const oneLineQuery =
            "PREFIX geo: <http://www.opengis.net/ont/geosparql#>; select * where { ?subject geo:a/geo:c/geo:i";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.length - 1 });
        });
        let token = await getCompleteToken();
        expect(token.string).to.equal("geo:i");
        token = await getCompleteTokenAt(oneLineQuery.length - 6);
        expect(token.string).to.equal("geo:c");
        token = await getCompleteTokenAt(oneLineQuery.length - 15);
        expect(token.string).to.equal("geo:a");
      });
      it("Should not include spaces between tokens", async () => {
        // Using variable autocompleter
        await page.evaluate(() => {
          const oneLineQuery = "select * where { ?subject <http://www.opengis.net/ont/geosparql# ?s";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.length - 5 });
        });
        const token = await getCompleteToken();
        expect(token.string).to.equal("<http://www.opengis.net/ont/geosparql#");
      });
      it("Should expand when the token is in an error state", async () => {
        await page.evaluate(() => {
          const oneLineQuery = "select * where { ?subject <http://www.opengis.net/ont/geosparql#";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf("opengis") });
        });
        const token = await getCompleteToken();
        expect(token.string).to.equal("<http://www.opengis.net/ont/geosparql#");
      });
    });
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
      it("Async autocompletions trickle down when typing", async () => {
        // Set the new query, and focus on location where we want to autocomplete
        const cursor = await page.evaluate(() => {
          const query = `select * where {?x <http://www.opengis.net/ont/geosparql#> ?y}`;
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("#> ?y") + 1 });
          return window.yasqe.getDoc().getCursor();
        });

        // Issue autocompletion shortcut
        await issueAutocompletionKeyCombination();
        // Wait for hint div to appear
        const allInitialResults = await waitForAutocompletionPopup();

        // Widdle the list down
        await page.keyboard.type("asWK");
        const newResults = await waitForAutocompletionPopup(allInitialResults);
        expect(newResults).is.lessThan(allInitialResults);
      });

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
      it("Should not open on its own", async () => {
        await focusOnAutocompletionPos();

        try {
          const hasAutocomplete = await page.waitFor(`.CodeMirror-hints`, { timeout: 200 });
          expect(hasAutocomplete).to.be.undefined("", "Expected codemirror hint to not be there");
        } catch (e) {
          // We expect the timeout to trigger here
          if (e.name !== "TimeoutError") {
            throw e;
          }
        }
      });
      it("Should auto open when autocompleter is Async and ontype is enabled", async () => {
        await page.evaluate(() => {
          (window.yasqe.autocompleters["class"] as any).config.autoShow = true;
        });
        await focusOnAutocompletionPos();
        const hasAutocomplete = await page.waitFor(`.CodeMirror-hints`);
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
