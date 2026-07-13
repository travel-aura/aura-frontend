interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (cfg: object) => void;
        renderButton: (el: HTMLElement, cfg: object) => void;
        prompt: () => void;
      };
    };
  };
}
