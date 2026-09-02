const getViewTransition = () => {
  if (!("document" in globalThis)) {
    return null;
  }

  const browserDocument = globalThis.document;

  if (!("startViewTransition" in browserDocument)) {
    return null;
  }

  return browserDocument.startViewTransition.bind(browserDocument);
};

const runThemeTransition = (updateTheme: () => void) => {
  const startViewTransition = getViewTransition();

  if (startViewTransition === null) {
    updateTheme();
    return;
  }

  startViewTransition(updateTheme);
};

export { runThemeTransition };
