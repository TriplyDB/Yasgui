export interface Plugin<Opts extends any> {
  priority: number;
  canHandleResults(): boolean;
  hideFromSelection?: boolean;
  // getPersistentSettings?: () => any;
  label?: string;
  options?: Opts;

  initialize?(): Promise<void>;
  destroy?(): void;
  draw(persistentConfig: any, runtimeConfig?: any): void;
  getIcon(): Element | undefined;
  download?(): DownloadInfo | undefined;
  helpReference?: string;
}
export interface DownloadInfo {
  contentType: string;
  getData: () => string;
  filename: string;
  title: string;
}
