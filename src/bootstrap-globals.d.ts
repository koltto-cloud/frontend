declare module 'bootstrap/js/dist/dropdown' {
  export default class Dropdown {
    static getOrCreateInstance(element: HTMLElement, options?: object): Dropdown;
    static getInstance(element: HTMLElement): Dropdown | null;
    dispose(): void;
  }
}

declare module 'bootstrap' {
  export class Modal {
    static getInstance(element: HTMLElement): Modal | null;
    static getOrCreateInstance(element: HTMLElement): Modal;
    hide(): void;
  }
}
