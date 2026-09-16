let developmentServerPromise;
let productionRendererPromise;

async function getDevelopmentRenderer() {
  if (!developmentServerPromise) {
    developmentServerPromise = import("vite").then(({ createServer }) => (
      createServer({
        appType: "custom",
        server: {
          hmr: false,
          middlewareMode: true,
          ws: false
        }
      })
    ));
  }

  const developmentServer = await developmentServerPromise;
  return developmentServer.ssrLoadModule("/app/render-document.jsx");
}

async function getProductionRenderer() {
  productionRendererPromise ??= import("../dist/server/render-document.js");
  return productionRendererPromise;
}

export async function renderDocument(properties) {
  const useProductionRenderer = process.env.NODE_ENV === "production"
    || process.env.npm_lifecycle_event === "start";
  const renderer = useProductionRenderer
    ? await getProductionRenderer()
    : await getDevelopmentRenderer();

  return renderer.renderDocument(properties);
}

export async function closeUiRenderer() {
  if (!developmentServerPromise) {
    return;
  }

  const developmentServer = await developmentServerPromise;
  await developmentServer.close();
}
