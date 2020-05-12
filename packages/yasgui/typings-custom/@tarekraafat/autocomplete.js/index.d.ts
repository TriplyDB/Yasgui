declare module "@tarekraafat/autocomplete.js" {
  export default class Autocomplete<T> {
    constructor(options: AutocompleteConfig<T>);
  }
  interface AutocompleteConfig<T> {
    data: {
      src: () => Promise<T[]>;
      key?: (keyof T)[]; // For now we will only search on "all" which is a concatenation of all fields
      cache: boolean;
    };
    query?: {
      manipulate?: (query: string) => string;
    };
    sort?: (a: Data<T>, b: Data<T>) => number;
    trigger?: { event?: string[]; condition?: (query: string) => boolean };
    placeholder?: string;
    selector?: string | (() => Element);
    threshold?: number;
    debounce?: number;
    searchEngine?: "strict" | "loose" | ((query: string, record: string) => boolean);
    resultsList?: {
      render?: boolean;
      container?: (source: HTMLUListElement) => void;
      destination?: Element;
      position?: "afterend" | "beforebegin" | "afterbegin" | "beforeend";
      element?: "ul";
    };
    maxResults?: number;
    highlight?: boolean;
    resultItem?: {
      content?: (data: Data<T>, source: HTMLElement) => void;
      element?: "li";
    };
    noResults?: () => void;
    onSelection?: (feedback: Feedback<T>) => void;
  }
  interface Feedback<T> {
    selection: { value: T };
    event: Event;
  }

  interface Data<T> {
    index: number; //index of suggestion in array of suggestions
    value: T; //suggestion object
    key: keyof T; //key that matches search string. In our case, always 'all'
    match: string; //suggestion value of the key above
  }
}
