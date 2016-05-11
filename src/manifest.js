

const getLayoutInfo = (layout) => {
  let name = layout.title.replace(/[^\w\.\-]/g, '_').toLowerCase();
  return {
    title: layout.title,
    layout_name: name,
    content_type: layout.content_type,
    component: !!layout.component,
    file: `${layout.component ? 'components' : 'layouts'}/${name}`
  }
};

const getAssetInfo = (asset) => {
  return {
    kind: asset.asset_type,
    filename: asset.filename,
    file: `${asset.asset_type}s/${asset.filename}`,
    content_type: asset.content_type
  };
};

const getManifest = (name) => {
  return new Promise((resolve, reject) => {
    Promise.all([getLayouts(name), getLayoutAssets(name)]).then(files => {
      resolve({
        layouts: files[0].map(getLayoutInfo),
        assets: files[1].map(getAssetInfo)
      });
    }, reject);
  });
};

const writeManifest = (name, manifest) => {
  let manifestPath = `${sites.dirFor(name)}/manifest2.json`;
  fileUtils.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
};

const generateRemoteManifest = (name) => {
  getManifest(name).then(_.curry(writeManifest)(name));
};

const readManifest = (name) => {
  let manifestFilePath = path.join(path.normalize(sites.dirFor(name)), 'manifest2.json');
  if (!fs.existsSync(manifestFilePath)) { return; }

  try {
    return JSON.parse(fs.readFileSync(manifestFilePath));
  } catch (e) {
    return;
  }
};

export default {
  getManifest,
  writeManifest
}