async function initViewer() {
    async function getAccessToken(callback) {
        const resp = await fetch('/api/auth/token');
        const json = await resp.json();
        const token = json.access_token;
        callback(token.access_token, token.expires_in);
    }
    await Autodesk.Viewing.Utilities.Initialize(document.getElementById('viewer'), getAccessToken);
    const viewer = NOP_VIEWER;
    viewer.loadExtension('IssuesExtension');
    viewer.loadExtension('HeatmapExtension');
    viewer.setQualityLevel(/* ambient shadows */ false, /* antialiasing */ true);
    viewer.setGroundShadow(true);
    viewer.setGroundReflection(false);
    viewer.setGhosting(true);
    viewer.setEnvMapBackground(false);
    viewer.setLightPreset(1);
    viewer.setSelectionColor(new THREE.Color(0xEBB30B));

    const geometryLoadedCallback = () => {
        viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, geometryLoadedCallback);
        //viewer.displayViewCube(true);
        //viewer.setViewCube('front, top, right');
        viewer.navigation.toOrthographic();
        viewer.fitToView();
    };
    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, geometryLoadedCallback);
}

async function initSidebar(facility) {
    initModelsTable(facility);
    initCharts(facility);
    initTables(facility);
}

async function initModelsTable(facility) {
    const resp = await fetch('/api/data/facilities/' + facility);
    const areas = await resp.json();
    const types = new Set();
    for (const areaKey in areas) {
        for (const prop of Object.getOwnPropertyNames(areas[areaKey])) {
            types.add(prop);
        }
    }

    // Create table header
    const $thead = $('<thead></thead>');
    const $row = $('<tr></tr>');
    $row.append(`<th>Area</th>`);
    for (const areaKey in areas) {
        $row.append(`<th class="model-area-select">${areaKey}</th>`);
    }
    $thead.append($row);
    const $table = $('#models').empty().append($thead);

    // Create table content
    const $tbody = $(`<tbody></tbody>`);
    for (const type of types.values()) {
        const $row = $('<tr></tr>');
        $row.append(`<th class="model-type-select">${type}</th>`);
        for (const areaKey in areas) {
            const area = areas[areaKey];
            if (area[type]) {
                $row.append(`<td><input type="checkbox" value="${area[type]}" data-area="${areaKey}" data-type="${type}" /></td>`);
            } else {
                $row.append(`<td></td>`);
            }
        }
        $tbody.append($row);
    }
    $table.append($tbody);

    // Setup event handlers
    $('#models input').on('change', function() {
        const urn = this.value;
        if (this.checked) {
            addModel(urn);
        } else {
            removeModel(urn);
        }
    });
    $('#models .model-area-select').on('click', function() {
        const area = $(this).text();
        const checkboxes = Array.from($(`#models input[data-area="${area}"]`));
        if (checkboxes.filter(el => el.checked).length > 0) {
            for (const checkbox of checkboxes) {
                checkbox.checked = false;
                removeModel(checkbox.value);
            }
        } else {
            for (const checkbox of checkboxes) {
                checkbox.checked = true;
                addModel(checkbox.value);
            }
        }
    });
    $('#models .model-type-select').on('click', function() {
        const type = $(this).text();
        const checkboxes = Array.from($(`#models input[data-type="${type}"]`));
        if (checkboxes.filter(el => el.checked).length > 0) {
            for (const checkbox of checkboxes) {
                checkbox.checked = false;
                removeModel(checkbox.value);
            }
        } else {
            for (const checkbox of checkboxes) {
                checkbox.checked = true;
                addModel(checkbox.value);
            }
        }
    });

    // By default, load all models for the first available area
    const area = Object.getOwnPropertyNames(areas)[0];
    const checkboxes = Array.from($(`#models input[data-area="${area}"]`));
    for (const checkbox of checkboxes) {
        checkbox.checked = true;
        addModel(checkbox.value);
    }
}

function initCharts(facility) {
    const temperatureChart = new Chart(document.getElementById('temperature-chart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Temperature [F]',
                borderColor: 'rgba(255, 196, 0, 1.0)',
                backgroundColor: 'rgba(255, 196, 0, 0.5)',
                data: []
            }]
        },
        options: {
            scales: {
                xAxes: [{ type: 'realtime', realtime: { delay: 2000 } }],
                yAxes: [{ ticks: { beginAtZero: true } }]
            }
        }
    });

    const pressureChart = new Chart(document.getElementById('pressure-chart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Pressure [MPa]',
                borderColor: 'rgba(255, 196, 0, 1.0)',
                backgroundColor: 'rgba(255, 196, 0, 0.5)',
                data: []
            }]
        },
        options: {
            scales: {
                xAxes: [{ type: 'realtime', realtime: { delay: 2000 } }],
                yAxes: [{ ticks: { beginAtZero: true } }]
            }
        }
    });

    const $alert =  $('#realtime div.alert');
    const $temperatureChart = $('#temperature-chart');
    const $pressureChart = $('#pressure-chart');
    $alert.show();
    $temperatureChart.hide();
    $pressureChart.hide();
    NOP_VIEWER.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, function(ev) {
        const results = NOP_VIEWER.getAggregateSelection();
        if (results.length === 1 && results[0].selection.length === 1) {
            console.log('Selected model', results[0].model, 'dbid', results[0].selection);
            $alert.hide();
            $temperatureChart.show();
            $pressureChart.show();
        } else {
            $alert.show();
            $temperatureChart.hide();
            $pressureChart.hide();
        }
    });

    setInterval(function() {
        temperatureChart.data.datasets[0].data.push({
            x: Date.now(),
            y: 175.0 + Math.random() * 50.0
        });
        pressureChart.data.datasets[0].data.push({
            x: Date.now(),
            y: 975.0 + Math.random() * 50.0
        });
    }, 1000);
}

function initTables(facility) {
    let issuesTable;

    async function updateIssues() {
        if (issuesTable) {
            issuesTable.rows().deselect();
            issuesTable.destroy();
        }
        const $tbody = $('#issues-table > tbody');
        $tbody.empty();

        const resp = await fetch(`/api/data/facilities/${facility}/issues`);
        const issues = await resp.json();
        for (const issue of issues) {
            $tbody.append(`
                <tr>
                    <td>${new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td>${issue.author}</td>
                    <td>${issue.text}</td>
                </tr>
            `);
        }
        issuesTable = $('#issues-table').DataTable(/*{ select: true }*/);
    }

    updateIssues();
}

async function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 45.643940, lng: -73.520483 },
        zoom: 16
    });
    map.setMapTypeId('satellite');

    const resp = await fetch('/api/data/facilities');
    const facilities = await resp.json();
    for (const facility of facilities) {
        const url = '/facility/' + facility.id;
        const facilityPath = new google.maps.Polygon({
            path: facility.region,
            geodesic: true,
            strokeColor: '#EBB30B',
            strokeOpacity: 0.8,
            fillColor: '#EBB30B',
            fillOpacity: 0.6,
            strokeWeight: 2
        });
        facilityPath.setMap(map);
        facilityPath.addListener('click', function() { window.location = url; });
        const infoWindow = new google.maps.InfoWindow();
        infoWindow.setContent(`<a href="${url}">${facility.name}</a>`);
        infoWindow.setPosition({
            lat: facility.region.reduce((prev, curr) => prev + curr.lat, 0) / facility.region.length,
            lng: facility.region.reduce((prev, curr) => prev + curr.lng, 0) / facility.region.length,
        });
        infoWindow.open(map);
    }
}

function addModel(urn) {
    const models = NOP_VIEWER.getVisibleModels();
    const model = models.find(m => m.getData().urn === urn);
    if (!model) {
        Autodesk.Viewing.Document.load(
            'urn:' + urn,
            function(doc) {
                const viewables = doc.getRoot().search({ type: 'geometry' });
                NOP_VIEWER.loadModel(doc.getViewablePath(viewables[0]));
            },
            function(err) {
                console.error(err);
            }
        );
    }
}

function removeModel(urn) {
    const models = NOP_VIEWER.getVisibleModels();
    const model = models.find(m => m.getData().urn === urn);
    if (model) {
        NOP_VIEWER.impl.unloadModel(model);
    }
}

$(async function() {
    await initViewer();
    const urlTokens = window.location.pathname.split('/');
    const facility = urlTokens[urlTokens.length - 1];
    initSidebar(facility);
});
