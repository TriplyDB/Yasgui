export { default as Storage } from "./Storage";

export function drawSvgStringAsElement(svgString: string) {
  if (svgString && svgString.trim().indexOf("<svg") == 0) {
    //no style passed via config. guess own styles
    var parser = new DOMParser();
    var dom = parser.parseFromString(svgString, "text/xml");
    var svg = dom.documentElement;
    svg.setAttribute("aria-hidden", "true");

    var svgContainer = document.createElement("div");
    svgContainer.className = "svgImg";
    svgContainer.appendChild(svg);
    return svgContainer;
  }
  throw new Error("No svg string given. Cannot draw");
}
export interface FaIcon {
  width: number;
  height: number;
  svgPathData: string;
}

/**
 * Draws font fontawesome icon as svg. This is a lot more lightweight then the option that is offered by fontawesome
 * @param faIcon
 * @returns
 */
export function drawFontAwesomeIconAsSvg(faIcon: FaIcon) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${faIcon.width} ${faIcon.height}" aria-hidden="true"><path fill="currentColor" d="${faIcon.svgPathData}"></path></svg>`;
}

export function hasClass(el: Element | undefined, className: string) {
  if (!el) return;
  if (el.classList) return el.classList.contains(className);
  else return !!el.className.match(new RegExp("(\\s|^)" + className + "(\\s|$)"));
}

export function addClass(el: Element | undefined | null, ...classNames: string[]) {
  if (!el) return;
  for (const className of classNames) {
    if (el.classList) el.classList.add(className);
    else if (!hasClass(el, className)) el.className += " " + className;
  }
}

export function removeClass(el: Element | undefined | null, className: string) {
  if (!el) return;
  if (el.classList) el.classList.remove(className);
  else if (hasClass(el, className)) {
    var reg = new RegExp("(\\s|^)" + className + "(\\s|$)");
    el.className = el.className.replace(reg, " ");
  }
}

export function getAsValue<E, A>(valueOrFn: E | ((arg: A) => E), arg: A): E {
  if (typeof valueOrFn === "function") return (valueOrFn as any)(arg);
  return valueOrFn;
}
