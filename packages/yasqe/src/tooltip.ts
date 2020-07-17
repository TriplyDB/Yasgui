/**
 * Write our own tooltip, to avoid loading another library for just this functionality. For now, we only use tooltip for showing parse errors, so this is quite a tailored solution
 * Requirements:
 * 		position tooltip within codemirror frame as much as possible, to avoid z-index issues with external things on page
 * 		use html as content
 */
import Yasqe from "./";

export default function tooltip(_yasqe: Yasqe, parent: HTMLDivElement, html: string) {
  var tooltip: HTMLDivElement;
  parent.onmouseover = function () {
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "yasqe_tooltip";
    }
    // if ($(yasqe.getWrapperElement()).offset().top >= tooltip.offset().top) {
    //shit, move the tooltip down. The tooltip now hovers over the top edge of the yasqe instance
    // tooltip.css("bottom", "auto");
    // tooltip.css("top", "26px");
    // }
    tooltip.style.display = "block";
    tooltip.innerHTML = html;
    parent.appendChild(tooltip);
  };
  parent.onmouseout = function () {
    if (tooltip) {
      tooltip.style.display = "none";
    }
    tooltip.innerHTML = html;
  };
}
