//Do not want to important this using typescript. Somehow, we get a tangled mess when transpiling to es6 with ts,
//and applying babel.
export const CodeMirror = require("codemirror");

import * as sparql11Mode from "../grammar/tokenizer";
import { default as prefixFold } from "./prefixFold";
import { TokenizerState } from "./index";

require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");
require("codemirror/addon/hint/show-hint.js");
require("codemirror/addon/search/searchcursor.js");
require("codemirror/addon/search/match-highlighter.js");
require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/addon/runmode/runmode.js");
require("codemirror/lib/codemirror.css");
require("codemirror/addon/fold/foldgutter.css");
require("./scss/codemirrorMods.scss");

CodeMirror.registerHelper("fold", "prefix", prefixFold);
CodeMirror.defineMode("sparql11", sparql11Mode.default);

export interface Doc extends CodeMirror.Doc {}
export interface Token extends CodeMirror.Token {
  state: sparql11Mode.State;
}

export interface CodeMirror {
  /**
   * Added some codemirror-specific defs below
   */

  /** Tells you whether the editor currently has focus. */
  hasFocus(): boolean;

  /** Used to find the target position for horizontal cursor motion.start is a { line , ch } object,
            amount an integer(may be negative), and unit one of the string "char", "column", or "word".
            Will return a position that is produced by moving amount times the distance specified by unit.
            When visually is true , motion in right - to - left text will be visual rather than logical.
            When the motion was clipped by hitting the end or start of the document, the returned value will have a hitSide property set to true. */
  findPosH(
    start: CodeMirror.Position,
    amount: number,
    unit: string,
    visually: boolean
  ): { line: number; ch: number; hitSide?: boolean };

  /** Similar to findPosH , but used for vertical motion.unit may be "line" or "page".
     The other arguments and the returned value have the same interpretation as they have in findPosH. */
  findPosV(start: CodeMirror.Position, amount: number, unit: string): { line: number; ch: number; hitSide?: boolean };

  /** Returns the start and end of the 'word' (the stretch of letters, whitespace, or punctuation) at the given position. */
  findWordAt(pos: CodeMirror.Position): CodeMirror.Range;

  // /** Change the configuration of the editor. option should the name of an option, and value should be a valid value for that option. */
  // setOption(option: string, value: any): void;

  /** Attach an additional keymap to the editor.
            This is mostly useful for add - ons that need to register some key handlers without trampling on the extraKeys option.
            Maps added in this way have a higher precedence than the extraKeys and keyMap options, and between them,
            the maps added earlier have a lower precedence than those added later, unless the bottom argument was passed,
            in which case they end up below other keymaps added with this method. */
  addKeyMap(map: any, bottom?: boolean): void;

  /** Disable a keymap added with addKeyMap.Either pass in the keymap object itself , or a string,
     which will be compared against the name property of the active keymaps. */
  removeKeyMap(map: any): void;

  /** Enable a highlighting overlay.This is a stateless mini - mode that can be used to add extra highlighting.
            For example, the search add - on uses it to highlight the term that's currently being searched.
            mode can be a mode spec or a mode object (an object with a token method). The options parameter is optional. If given, it should be an object.
            Currently, only the opaque option is recognized. This defaults to off, but can be given to allow the overlay styling, when not null,
            to override the styling of the base mode entirely, instead of the two being applied together. */
  addOverlay(mode: any, options?: any): void;

  /** Pass this the exact argument passed for the mode parameter to addOverlay to remove an overlay again. */
  removeOverlay(mode: any): void;

  /** Attach a new document to the editor. Returns the old document, which is now no longer associated with an editor. */
  swapDoc(doc: CodeMirror.Doc): CodeMirror.Doc;

  /** Get the content of the current editor document. You can pass it an optional argument to specify the string to be used to separate lines (defaults to "\n"). */
  getValue(seperator?: string): string;

  /** Set the content of the current editor document. */
  setValue(content: string): void;

  /** Sets the gutter marker for the given gutter (identified by its CSS class, see the gutters option) to the given value.
     Value can be either null, to clear the marker, or a DOM element, to set it. The DOM element will be shown in the specified gutter next to the specified line. */
  setGutterMarker(line: any, gutterID: string, value: HTMLElement | null): CodeMirror.LineHandle;

  /** Remove all gutter markers in the gutter with the given ID. */
  clearGutter(gutterID: string): void;

  /** Set a CSS class name for the given line.line can be a number or a line handle.
            where determines to which element this class should be applied, can can be one of "text" (the text element, which lies in front of the selection),
            "background"(a background element that will be behind the selection),
            or "wrap" (the wrapper node that wraps all of the line's elements, including gutter elements).
            class should be the name of the class to apply. */
  addLineClass(line: any, where: string, _class_: string): CodeMirror.LineHandle;

  /** Remove a CSS class from a line.line can be a line handle or number.
            where should be one of "text", "background", or "wrap"(see addLineClass).
            class can be left off to remove all classes for the specified node, or be a string to remove only a specific class. */
  removeLineClass(line: any, where: string, class_?: string): CodeMirror.LineHandle;

  /** Returns the line number, text content, and marker status of the given line, which can be either a number or a line handle. */
  lineInfo(
    line: any
  ): {
    line: any;
    handle: any;
    text: string;
    /** Object mapping gutter IDs to marker elements. */
    gutterMarkers: any;
    textClass: string;
    bgClass: string;
    wrapClass: string;
    /** Array of line widgets attached to this line. */
    widgets: any;
  };

  /** Puts node, which should be an absolutely positioned DOM node, into the editor, positioned right below the given { line , ch } position.
            When scrollIntoView is true, the editor will ensure that the entire node is visible (if possible).
            To remove the widget again, simply use DOM methods (move it somewhere else, or call removeChild on its parent). */
  addWidget(pos: CodeMirror.Position, node: HTMLElement, scrollIntoView: boolean): void;

  /** Adds a line widget, an element shown below a line, spanning the whole of the editor's width, and moving the lines below it downwards.
            line should be either an integer or a line handle, and node should be a DOM node, which will be displayed below the given line.
            options, when given, should be an object that configures the behavior of the widget.
            Note that the widget node will become a descendant of nodes with CodeMirror-specific CSS classes, and those classes might in some cases affect it. */
  addLineWidget(
    line: any,
    node: HTMLElement,
    options?: {
      /** Whether the widget should cover the gutter. */
      coverGutter: boolean;
      /** Whether the widget should stay fixed in the face of horizontal scrolling. */
      noHScroll: boolean;
      /** Causes the widget to be placed above instead of below the text of the line. */
      above: boolean;
      /** When true, will cause the widget to be rendered even if the line it is associated with is hidden. */
      showIfHidden: boolean;
    }
  ): CodeMirror.LineWidget;

  /** Programatically set the size of the editor (overriding the applicable CSS rules).
            width and height height can be either numbers(interpreted as pixels) or CSS units ("100%", for example).
            You can pass null for either of them to indicate that that dimension should not be changed. */
  setSize(width: any, height: any): void;

  /** Scroll the editor to a given(pixel) position.Both arguments may be left as null or undefined to have no effect. */
  scrollTo(x?: number | null, y?: number | null): void;

  /** Get an { left , top , width , height , clientWidth , clientHeight } object that represents the current scroll position, the size of the scrollable area,
     and the size of the visible area(minus scrollbars). */
  getScrollInfo(): CodeMirror.ScrollInfo;

  /** Scrolls the given element into view. pos is a { line , ch } position, referring to a given character, null, to refer to the cursor.
     The margin parameter is optional. When given, it indicates the amount of pixels around the given area that should be made visible as well. */
  scrollIntoView(pos: CodeMirror.Position | null, margin?: number): void;

  /** Scrolls the given element into view. pos is a { left , top , right , bottom } object, in editor-local coordinates.
     The margin parameter is optional. When given, it indicates the amount of pixels around the given area that should be made visible as well. */
  scrollIntoView(pos: { left: number; top: number; right: number; bottom: number }, margin: number): void;

  /** Scrolls the given element into view. pos is a { line, ch } object, in editor-local coordinates.
     The margin parameter is optional. When given, it indicates the amount of pixels around the given area that should be made visible as well. */
  scrollIntoView(pos: { line: number; ch: number }, margin?: number): void;

  /** Scrolls the given element into view. pos is a { from, to } object, in editor-local coordinates.
     The margin parameter is optional. When given, it indicates the amount of pixels around the given area that should be made visible as well. */
  scrollIntoView(pos: { from: CodeMirror.Position; to: CodeMirror.Position }, margin: number): void;

  /** Returns the line height of the default font for the editor. */
  defaultTextHeight(): number;

  /** Returns the pixel width of an 'x' in the default font for the editor.
     (Note that for non - monospace fonts , this is mostly useless, and even for monospace fonts, non - ascii characters might have a different width). */
  defaultCharWidth(): number;

  /** Returns a { from , to } object indicating the start (inclusive) and end (exclusive) of the currently rendered part of the document.
            In big documents, when most content is scrolled out of view, CodeMirror will only render the visible part, and a margin around it.
            See also the viewportChange event. */
  getViewport(): { from: number; to: number };

  /** If your code does something to change the size of the editor element (window resizes are already listened for), or unhides it,
     you should probably follow up by calling this method to ensure CodeMirror is still looking as intended. */
  refresh(): void;

  /** Retrieves information about the token the current mode found before the given position (a {line, ch} object). */
  getTokenAt(pos: CodeMirror.Position, precise?: boolean): Token;

  /** This is similar to getTokenAt, but collects all tokens for a given line into an array. */
  getLineTokens(line: number, precise?: boolean): Token[];

  /** Returns the mode's parser state, if any, at the end of the given line number.
            If no line number is given, the state at the end of the document is returned.
            This can be useful for storing parsing errors in the state, or getting other kinds of contextual information for a line. */
  getStateAfter(line?: number): any;

  /** CodeMirror internally buffers changes and only updates its DOM structure after it has finished performing some operation.
            If you need to perform a lot of operations on a CodeMirror instance, you can call this method with a function argument.
            It will call the function, buffering up all changes, and only doing the expensive update after the function returns.
            This can be a lot faster. The return value from this method will be the return value of your function. */
  operation<T>(fn: () => T): T;

  /** Adjust the indentation of the given line.
            The second argument (which defaults to "smart") may be one of:
            "prev" Base indentation on the indentation of the previous line.
            "smart" Use the mode's smart indentation if available, behave like "prev" otherwise.
            "add" Increase the indentation of the line by one indent unit.
            "subtract" Reduce the indentation of the line. */
  indentLine(line: number, dir?: string): void;

  /** Tells you whether the editor's content can be edited by the user. */
  isReadOnly(): boolean;

  /** Runs the command with the given name on the editor. */
  execCommand(name: string): void;

  /** Give the editor focus. */
  focus(): void;

  /** Returns the hidden textarea used to read input. */
  getInputField(): HTMLTextAreaElement;

  /** Returns the DOM node that represents the editor, and controls its size. Remove this from your tree to delete an editor instance. */
  getWrapperElement(): HTMLElement;

  /** Returns the DOM node that is responsible for the scrolling of the editor. */
  getScrollerElement(): HTMLElement;

  /** Fetches the DOM node that contains the editor gutters. */
  getGutterElement(): HTMLElement;

  /**
   * Added some more specific typings for `getOption`
   * For some functions (called from keyboard combinations like ctrl-enter) we cannot use member props of our object
   * as these are lost when we are receiving the native CM object as argument
   * Only way to persistently store these options is by using getOption and setOption
   */
  getOption(opt: "queryType"): TokenizerState["queryType"];
  setOption(opt: "queryType", val: TokenizerState["queryType"]): void;
}
