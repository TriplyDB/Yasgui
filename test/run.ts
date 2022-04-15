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

describe("Yasqe", function () {
  // Define global variables
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  let server: http.Server | undefined;

  /**
   * When issuing page.keyboard.type commands, codemirror might not have processed the command
   * fully when that promise is resolved.
   * So, use our own function where we wait for codemirror to have processed all key-downs
   */
  async function type(text: string) {
    await page.keyboard.type(text);
    await page.waitForFunction(`window.yasqe.getValue().indexOf("${text}") >= 0`, { timeout: 600 });
  }
  before(async function () {
    const refs = await setup(this, path.resolve("./build"));
    browser = refs.browser;
    server = refs.server;
  });

  beforeEach(async () => {
    page = await getPage(browser, "yasqe.html");
    await page.evaluate(() => localStorage.clear());
  });

  afterEach(async () => {
    await closePage(this, page);
  });

  after(async function () {
    return destroy(browser, server);
  });

  it("get a value", async function () {
    const value = await page.evaluate(() => {
      return window.yasqe.getValue();
    });
    expect(value).to.contain("SELECT");
  });

  async function waitForAutocompletionPopup(shouldNotHaveLength?: number): Promise<number | undefined> {
    if (shouldNotHaveLength) {
      await page.waitForFunction(
        `document.querySelector('.CodeMirror-hints').children.length !== ${shouldNotHaveLength}`,
        { timeout: 600 }
      );
    } else {
      await page.waitFor(`.CodeMirror-hints`, { timeout: 600 });
    }
    return page.evaluate(() => document.querySelector(".CodeMirror-hints")?.children.length);
  }

  async function issueAutocompletionKeyCombination() {
    await page.keyboard.down("Control");
    await page.keyboard.press("Space");
    await page.keyboard.up("Control");
  }

  describe("Autoformatting", function () {
    it("With literal", async function () {
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
    it("With group concat", async function () {
      const value = await page.evaluate(() => {
        window.yasqe.setValue(`select (group_concat(str(?a); separator='" "') as ?b) { }`);
        window.yasqe.autoformat();
        return window.yasqe.getValue();
      });
      expect(value).to.equal(`select (group_concat(str(?a); separator='" "') as ?b) {
}`);
    });
  });
  describe("Autoadd prefixes", function () {
    //note: this test also covers the infinite loop issue described here:
    //https://github.com/TriplyDB/YASGUI.YASQE/issues/135
    it("Should autoadd foaf prefix", async function () {
      await page.evaluate(() => {
        const query = `# prefix #
PREFIX geo: <http://www.opengis.net/ont/geosparql#> select
* where { `;
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: window.yasqe.getDoc().lineCount(), ch: 0 });
        return window.yasqe.getDoc().getCursor();
      });
      await type("foaf:");
      await page.waitForFunction(
        () => {
          return window.yasqe.getValue().indexOf("PREFIX foaf: <http://xmlns.com/foaf/0.1/>") >= 0;
        },
        {
          polling: 10,
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
      await type("testa:");
      await page.waitForFunction(
        () => {
          return window.yasqe.getValue().indexOf("PREFIX testa: <https://test.a.com/>") >= 0;
        },
        {
          polling: 10,
        }
      );
      //Note from Laurens: This is an invalid test. We should not expect a popup here (this is the property-autocompleter).
      //Reason: we didn't configure yasgui to auto-show the lov property completions
      //Leaving it here as it doesn't warrant a new issue yet.
      await waitForAutocompletionPopup();
    });
    it("path traversal should change the correct segment", async () => {
      await page.evaluate(() => {
        const query =
          "PREFIX testa: <https://test.a.com/> select * where { ?s testa:someprop/testa:/testa:someotherprop";
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf(":/testa:someotherprop") });
        return window.yasqe.getDoc().getCursor();
      });
      await issueAutocompletionKeyCombination();
      await waitForAutocompletionPopup();
      await page.keyboard.press("Enter");
      const newValue = await page.evaluate(() => window.yasqe.getValue());
      expect(newValue).to.equal(
        "PREFIX testa: <https://test.a.com/> select * where { ?s testa:someprop/testa:0/testa:someotherprop"
      );
    });
    it("path traversal should search with the correct path segment", async () => {
      await page.evaluate(() => {
        const query =
          "PREFIX testa: <https://test.a.com/> select * where { ?s testa:someprop/testa:someotherprop/testa;";
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf(";") });
        return window.yasqe.getDoc().getCursor();
      });
      await issueAutocompletionKeyCombination();
      try {
        const hasAutocomplete = await waitForAutocompletionPopup();
        expect(hasAutocomplete).to.be.undefined("", "Expected codemirror hint to not be there");
      } catch (e) {
        // We expect the timeout to trigger here
        if ((e as any).name !== "TimeoutError") {
          throw e;
        }
      }
    });
  });
  describe("Autocompleting", function () {
    const getCompleteToken = () => {
      return page.evaluate(() => window.yasqe.getCompleteToken());
    };
    const getCompleteTokenAt = (character: number, line?: number) => {
      return page.evaluate(
        (at: { character: number; line?: number }) => {
          window.yasqe.getDoc().setCursor({ line: at.line || window.yasqe.getCursor().line, ch: at.character });
          return window.yasqe.getCompleteToken();
        },
        { character: character, line: line } as puppeteer.Serializable
      );
    };
    it("Should only trigger get request when needed", async () => {
      // Setting up
      await page.evaluate(() => {
        const query = `PREFIX testa: <https://test.a.com/> select * where {?x a <htt`;
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
      await type("ps://");
      await wait(200);
      expect(await getShowCount()).to.be.lessThan(7);
      expect(await getHideCount()).to.equal(0);
    });
    it("Should show the same results irregardless of where the cursor is", async () => {
      await page.evaluate(() => {
        const query = `select * where { ?s <https://test.a.com/55`;
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.length });
        return window.yasqe.getDoc().getCursor();
      });
      await issueAutocompletionKeyCombination();
      expect(await waitForAutocompletionPopup()).to.equal(11);
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const query = `select * where { ?s <https://test.a.com/55`;
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("/test.a") });
      });
      await issueAutocompletionKeyCombination();
      expect(await waitForAutocompletionPopup()).to.equal(11);
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const query = `select * where { ?s <https://test.a.com/55`;
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("/55") });
      });
      await issueAutocompletionKeyCombination();
      expect(await waitForAutocompletionPopup()).to.equal(11);

      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const query = `select * where { ?s <https://test.a.com/55`;
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.indexOf("http") });
      });
      await issueAutocompletionKeyCombination();
      expect(await waitForAutocompletionPopup()).to.equal(11);
    });
    it("Should work without trailing whitespace", async () => {
      await page.evaluate(() => {
        const query = "select * where { ?subject ?predicate ?s}";
        window.yasqe.setValue(query);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: query.length - 2 });
        return window.yasqe.getDoc().getCursor();
      });
      await issueAutocompletionKeyCombination();
      await waitForAutocompletionPopup();

      await page.keyboard.press("Enter");
      const newValue = await page.evaluate(() => window.yasqe.getValue());
      expect(newValue).to.equal("select * where { ?subject ?predicate ?subject}");
    });

    it("Should scope to only one part of a path expression", async () => {
      const oneLineQuery = "PREFIX testa: <https://test.a.com/> select * where { ?subject testa:/testa:2/testa:3";

      await page.evaluate(() => {
        const oneLineQuery = "PREFIX testa: <https://test.a.com/> select * where { ?subject testa:/testa:2/testa:3";
        window.yasqe.setValue(oneLineQuery);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.length - 1 });
      });
      let token = await getCompleteToken();
      expect(token.string).to.equal("testa:3");
      token = await getCompleteTokenAt(oneLineQuery.length - 8);
      expect(token.string).to.equal("testa:2");
      token = await getCompleteTokenAt(oneLineQuery.length - 16);
      expect(token.string).to.equal("testa:");

      //token is now in beginning of property path
      await issueAutocompletionKeyCombination();
      await waitForAutocompletionPopup();

      await page.keyboard.press("Enter");
      const newValue = await page.evaluate(() => window.yasqe.getValue());
      expect(newValue).to.equal(
        "PREFIX testa: <https://test.a.com/> select * where { ?subject testa:0/testa:2/testa:3"
      );
    });

    it("Should deal with infinished full iri", async () => {
      await page.evaluate(() => {
        const oneLineQuery = "select * where { ?subject <http://www.opengis.net/ont/geosparql# ?s";
        window.yasqe.setValue(oneLineQuery);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.length - 5 });
      });

      await issueAutocompletionKeyCombination();
      await waitForAutocompletionPopup();

      await page.keyboard.press("Enter");
      const newValue = await page.evaluate(() => window.yasqe.getValue());
      expect(newValue).to.equal("select * where { ?subject <http://www.opengis.net/ont/geosparql#defaultGeometry> ?s");
    });

    it("Should autocomplete from middle of unfinished iri", async () => {
      await page.evaluate(() => {
        const oneLineQuery = "select * where { ?subject <http://www.opengis.net/ont/geosparql#";
        window.yasqe.setValue(oneLineQuery);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf("opengis") });
      });

      await issueAutocompletionKeyCombination();
      await waitForAutocompletionPopup();

      await page.keyboard.press("Enter");
      const newValue = await page.evaluate(() => window.yasqe.getValue());
      expect(newValue).to.equal("select * where { ?subject <http://www.opengis.net/ont/geosparql#defaultGeometry>");

      await page.evaluate(() => {
        const oneLineQuery = "select * where { ?subject <http://www.opengis.net/ont/geosparql#";
        window.yasqe.setValue(oneLineQuery);
        window.yasqe.focus();
        window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf("opengis") });
      });
      const token = await getCompleteToken();
      expect(token.string).to.equal("<http://www.opengis.net/ont/geosparql#");
    });

    describe("getCompleteToken", () => {
      it("Should expand to the end", async () => {
        await page.evaluate(() => {
          const oneLineQuery = "select * where { ?subject <http://www.opengis.net/ont/geosparql#";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf("opengis") });
        });
        const token = await getCompleteToken();
        expect(token.string).to.equal("<http://www.opengis.net/ont/geosparql#");
      });

      it("Autocompleter should show suggestion directly after function #156", async () => {
        await page.evaluate(() => {
          const oneLineQuery = "select * where { bind(";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf("(") + 1 });
        });
        const token = await getCompleteToken();
        expect(token.state.possibleCurrent).contains(
          "IRI_REF",
          `IRI_REF not found in list: "${token.state.possibleCurrent.join('", "')}"`
        );
      });
      it("Autocompleter should show literal suggestion directly after function #156", async () => {
        await page.evaluate(() => {
          const oneLineQuery = 'select * where { bind("';
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf('"') + 1 });
        });
        const token = await getCompleteToken();
        expect(token.state.possibleCurrent).contains(
          "IRI_REF",
          `IRI_REF not found in list: "${token.state.possibleCurrent.join('", "')}"`
        );
      });
      it("Autocompleter should show correct results after closing bracket", async () => {
        await page.evaluate(() => {
          const oneLineQuery = "select * where { ?s ?p ?o }";
          window.yasqe.setValue(oneLineQuery);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: oneLineQuery.indexOf("}") + 1 });
        });
        const token = await getCompleteToken();
        expect(token.state.possibleCurrent).contains(
          "LIMIT",
          `LIMIT not found in list: "${token.state.possibleCurrent.join('", "')}"`
        );
      });
    });
    /**
     * This test is tricky, as it uses the LOV API in our test. I.e, if this test fails, first check whether LOV is actually up
     */
    describe("Async property autocompletion", function () {
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
        await page.evaluate(() => {
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
        await type("asWK");
        const newResults = await waitForAutocompletionPopup(allInitialResults);
        expect(newResults).is.lessThan(allInitialResults || 0);
      });

      it("Should not append the string we just typed (#1479)", async function () {
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
        await type("asW");

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
        expect(newValue.trim()).to.equal(
          `PREFIX geo: <http://www.opengis.net/ont/geosparql#> select * where {?x geo:asWKT ?y}`
        );
      });
      it("Should only include matching strings", async function () {
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
        await type("defau");
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
    });
    describe("Async class autocompletion", function () {
      function focusOnAutocompletionPos() {
        return page.evaluate(() => {
          const query = `PREFIX testb: <https://test.b.com/> select * where {?x a <htt`;
          window.yasqe.setValue(query);
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: query.length - 2 });
          return window.yasqe.getDoc().getCursor();
        });
      }
      it("Should use correct token for autocompleting classes (#1852)", async function () {
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
        expect(allResults).to.equal(1000);
      });
      it("Should not open on its own", async () => {
        await focusOnAutocompletionPos();

        try {
          const hasAutocomplete = await page.waitFor(`.CodeMirror-hints`, { timeout: 200 });
          expect(hasAutocomplete).to.be.undefined("", "Expected codemirror hint to not be there");
        } catch (e) {
          // We expect the timeout to trigger here
          if ((e as any).name !== "TimeoutError") {
            throw e;
          }
        }
      });
      it("Should auto open when autocompleter is Async and ontype is enabled", async () => {
        await page.evaluate(() => {
          (window.yasqe.autocompleters["class-local"] as any).config.autoShow = true;
        });
        await focusOnAutocompletionPos();
        await page.waitFor(`.CodeMirror-hints`);
      });
    });
    describe("Async prefix autocompletion", function () {
      function focusOnAutocompletionPos() {
        return page.evaluate(() => {
          window.yasqe.setValue("");
          window.yasqe.focus();
          window.yasqe.getDoc().setCursor({ line: 0, ch: 0 });
          return window.yasqe.getDoc().getCursor();
        });
      }

      it("Should autocomplete", async function () {
        // await inspectLive(this)
        /**
         * Set the new query, and focus on location where we want to autocomplete
         */
        await focusOnAutocompletionPos();
        /**
         * Issue autocompletion shortcut
         */
        await type("prefix t");
        /**
         * Wait for hint div to appear
         */
        const results = await waitForAutocompletionPopup();
        expect(results).to.equal(3);

        /**
         * Type a string to reduce autocompletion list
         */
        await type("esta");

        const filteredResults = await waitForAutocompletionPopup(3);
        expect(filteredResults).to.equal(1);
        /**
         * Select the first suggestion
         */
        await page.keyboard.press("Enter");

        /**
         * Check whether that suggestion is now correctly included in yasqe
         */
        const newValue = await page.evaluate(() => window.yasqe.getValue());
        expect(newValue).to.equal("prefix testa: <https://test.a.com/>");
      });
    });

    describe("Single line autocompletion", function () {
      async function executeFirstLineAutocompletion(query: string) {
        await page.evaluate((query) => {
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

      it("Should autocomplete with multiple statements on one line", async function () {
        const query = `SELECT * WHERE {
          ?a <somwething.something.without.bbc.url> ?b. ?a <http
        }`;
        const autocompletedQuery = await executeFirstLineAutocompletion(query);
        expect(autocompletedQuery).to.contain("<http://www.opengis.net/ont/geosparql#defaultGeometry>");
      });

      it("Should autocomplete with single-line Predicate-Object lists", async function () {
        const query = `SELECT * WHERE {
          ?a <somwething.something.without.bbc.url> ?b ; <http
        }`;
        const autocompletedQuery = await executeFirstLineAutocompletion(query);
        expect(autocompletedQuery).to.contain("<http://www.opengis.net/ont/geosparql#defaultGeometry>");
      });

      it("Should autocomplete with single-line Object lists", async function () {
        const query = `SELECT * WHERE {
          ?a a ?b, <http
        }`;
        const autocompletedQuery = await executeFirstLineAutocompletion(query);
        expect(autocompletedQuery).to.contain("<https://test.b.com/0>");
      });
    });
  });
});
