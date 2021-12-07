export interface Plugin<Opts extends any> {
  priority: number;
  canHandleResults(): boolean;
  hideFromSelection?: boolean;
  // getPersistentSettings?: () => any;
  label?: string;
  options?: Opts;

  initialize?(): Promise<void>;
  destroy?(): void;
  draw(persistentConfig: any, runtimeConfig?: any): Promise<void> | void;
  getIcon(): Element | undefined;
  download?(filename?: string): DownloadInfo | undefined;
  helpReference?: string;
}
export interface DownloadInfo {
  contentType: string;
  /**
   * File contents as a string or a data url
   */
  getData: () => string;
  filename: string;
  title: string;
}
