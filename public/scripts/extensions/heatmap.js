const HEATMAP_TYPES = ['Temperature', 'Pressure'];

class HeatmapExtension extends Autodesk.Viewing.Extension {
    load() {
        this._utils = new Autodesk.Viewing.Utilities(this.viewer);
        this._enabled = false;
        this._intensity = 0.5;
        this._type = HEATMAP_TYPES[0];

        if (this.viewer.toolbar) {
            this._createUI();
        } else {
            const onToolbarCreated = () => {
                this._createUI();
                this.viewer.removeEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, onToolbarCreated);
            };
            this.viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, onToolbarCreated);
        }
        return true;
    }

    unload() {
        this.viewer.toolbar.removeControl(this.toolbar);
        return true;
    }

    refresh() {
        if (this._enabled) {
            this._applyColors();
        }
    }

    _createUI() {
        const viewer = this.viewer;
        const refresh = this.refresh.bind(this);

        this.panel = new HeatmapPanel(viewer, viewer.container, (change) => {
            if (change.intensity) { this._intensity = change.intensity; }
            if (change.type) { this._type = change.type; }
            this._applyColors();
        });
        this.panel.setVisible(false);

        this.button = new Autodesk.Viewing.UI.Button('HeatmapButton');
        this.button.onClick = () => {
            this._enabled = !this._enabled;
            this.panel.setVisible(this._enabled);
            if (this._enabled) {
                this._applyColors();
                this.button.setState(0);
                viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, refresh);
            } else {
                this._removeColors();
                this.button.setState(1);
                viewer.removeEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, refresh);
            }
            viewer.impl.invalidate(true, true, true);
        };
        const icon = this.button.container.children[0];
        icon.classList.add('fas', 'fa-fire');
        this.button.setToolTip('Heatmaps');
        this.toolbar = viewer.toolbar.getControl('CustomToolbar') || new Autodesk.Viewing.UI.ControlGroup('CustomToolbar');
        this.toolbar.addControl(this.button);
        viewer.toolbar.addControl(this.toolbar);
    }

    _getTemperature(id) {
        // For now, mock temperature (from 0.0 to 100.0) data based on object ID
        return (id % 1000) * 0.1;
    }

    _getPressure(id) {
        // For now, mock pressure data (from 0.0 to 10.0) based on object ID
        return (id % 100) * 0.1;
    }

    _applyColors() {
        const viewer = this.viewer;
        const type = this._type;
        const intensity = this._intensity;
        const models = this.viewer.getVisibleModels();
        for (const model of models) {
            const urn = model.getData().urn;
            // Hack: only apply heatmaps to models with "equipment" or "piping" in their object IDs
            const objectId = atob(urn).toLowerCase();
            if (objectId.indexOf('equipment') !== -1 || objectId.indexOf('piping') !== -1) {
                const tree = model.getData().instanceTree;
                if (!tree) {
                    console.warn('Instance tree for model not yet available', model);
                    continue;
                }
                const _model = model;
                tree.enumNodeChildren(tree.getRootId(), (id) => {
                    const color = new THREE.Color();
                    switch (type) {
                        case 'Temperature':
                            color.setHSL(this._getTemperature(id) / 100.0 * 0.33, 1.0, 0.5);
                            break;
                        case 'Pressure':
                            color.setHSL(this._getPressure(id) / 10.0 * 0.33, 1.0, 0.5);
                            break;
                    }
                    viewer.setThemingColor(id, new THREE.Vector4(color.r, color.g, color.b, intensity), _model);
                }, true);
            }
        }
    }

    _removeColors() {
        const models = this.viewer.getVisibleModels();
        for (const model of models) {
            this.viewer.clearThemingColors(model);
        }
    }
}

class HeatmapPanel extends Autodesk.Viewing.UI.DockingPanel {
    constructor(viewer, container, changeCallback) {
        super(container, 'HeatmapPanel', 'Heatmaps');
        this.viewer = viewer;
        this.table = document.createElement('table');
        this.table.className = 'adsk-lmv-tftable';
        this.tbody = document.createElement('tbody');
        this.table.appendChild(this.tbody);

        // Create the scroll container.  Adjust the height so the scroll container does not overlap
        // the resize handle.  50px accounts for the titlebar and resize handle.
        this.createScrollContainer({ heightAdjustment:70 });
        this.scrollContainer.appendChild(this.table);
        this.container.style.width  = '320px';
        this.container.style.top    = '260px';
        this.container.style.left   = '220px'; // just needs an initial value dock overrides value
        this.container.style.height = '160px';
        this.container.dockRight = true;

        this.intensitySlider = new Autodesk.Viewing.Private.OptionSlider('Intensity', 0, 100, this.tbody);
        this.intensitySlider.setValue(50.0);
        this.intensitySlider.sliderElement.step = this.intensitySlider.stepperElement.step = 1.0;
        this.addEventListener(this.intensitySlider, 'change', function(e) {
            changeCallback({ intensity: e.detail.value / 100.0 });
        });

        this.typeDropdown = new Autodesk.Viewing.Private.OptionDropDown('Type', this.tbody, HEATMAP_TYPES, HEATMAP_TYPES[0]);
        this.addEventListener(this.typeDropdown, 'change', function(e) {
            changeCallback({ type: HEATMAP_TYPES[e.detail.value] });
        });
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('HeatmapExtension', HeatmapExtension);
