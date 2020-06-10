export default function addScript(src: string, text?: string): Promise<void> {
  return new Promise<void>((resolve, _reject) => {
    var s = document.createElement("script");
    s.setAttribute("type", "text/javascript");
    s.setAttribute("async", "");
    s.setAttribute("src", src);

    if (text) s.innerHTML = text;
    s.onload = () => resolve();
    document.getElementsByTagName("head")[0].appendChild(s);
  });
}
