import * as DOMPurify from "dompurify";
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node instanceof HTMLAnchorElement) {
    node.target = "_blank";
    node.rel = "noopener noreferrer";
  }
});

//Casting to simple function. That way, any lib that depends on us
//wont have to require installing dompurify types
export default DOMPurify.sanitize as (val: string | Node) => string;
