import * as autocompleter from "./";

var conf: autocompleter.CompleterConfig = {
  name: "variables",
  isValidCompletionPosition: function (yasqe) {
    var token = yasqe.getTokenAt(yasqe.getDoc().getCursor());
    if (token.type != "ws") {
      token = yasqe.getCompleteToken(token);
      if (token && (token.string[0] === "?" || token.string[0] === "$")) {
        return true;
      }
    }
    return false;
  },
  get: function (yasqe, token) {
    if (!token || token.string.length == 0) return []; //nothing to autocomplete
    const distinctVars: { [varname: string]: any } = {};
    const vars: string[] = [];
    //do this outside of codemirror. I expect jquery to be faster here (just finding dom elements with classnames)
    //and: this'll still work when the query is incorrect (i.e., when simply typing '?')
    const atoms = yasqe.getWrapperElement().querySelectorAll(".cm-atom");
    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      var variable = atom.innerHTML;
      if (variable[0] === "?" || variable[0] === "$") {
        //ok, lets check if the next element in the div is an atom as well. In that case, they belong together (may happen sometimes when query is not syntactically valid)
        // var nextElClass = nextEl.attr("class");
        const nextEl: HTMLElement = <any>atom.nextSibling;
        if (nextEl && nextEl.className && nextEl.className.indexOf("cm-atom") >= 0) {
          variable += nextEl.innerText;
        }
        if (distinctVars[variable]) continue; //already in list
        //skip single questionmarks
        if (variable.length <= 1) continue;

        //it should match our token ofcourse
        if (variable.indexOf(token.string) !== 0) continue;

        //skip exact matches
        if (variable === token.string) continue;

        //store in map so we have a unique list
        distinctVars[variable] = true;
        vars.push(variable);
      }
    }
    return vars.sort();
  },
  bulk: false,
  autoShow: true,
};
export default conf;
