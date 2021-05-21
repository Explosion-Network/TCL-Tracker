let loadingAlert = document.getElementById("loading-alert");

function setAllCheckboxDisabled(disabled) {
    let inputs = document.getElementsByTagName("input");
    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];
        if (input.type === "checkbox") {
            input.disabled = disabled;
        }
    }
}

document.body.scrollTop = 0;
document.documentElement.scrollTop = 0;

$(".arrow").click(function () {
    document.getElementById("map").scrollIntoView({
        behavior: "smooth"
    });
})

let map = L.map("map").setView({lon: 4.85, lat: 45.75}, 11);
map.options.minZoom = 11;

// 45.7584, 4.8333
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// GTFS DATA INITIALIZATION
// Agency
$.ajax("gtfs/agency.csv", {
    dataType: "text/csv",

    complete: function (r) {
        if (Math.floor(r.status / 100) === 2) {
            let agency = Papa.parse(r.responseText, {header: true, skipEmptyLines: true}).data[0];
            console.debug(`Données reçues pour l'agence [${agency["agency_id"]}] ${agency["agency_name"]}. Website: ${agency['agency_url']}`)
        } else {
            alert("Received an error when trying to retrieve the GTFS data: HTTP "+r.status);
        }
    }
});

// Routes
$.ajax("gtfs/routes.csv", {
    dataType: "text/csv",

    complete: function (response) {
        if (Math.floor(response.status / 100) === 2) {
            let routes = Papa.parse(response.responseText, {header: true, skipEmptyLines: true}).data;
            let panel = document.getElementById("lines");
            let r = new Map();
            for (const route of routes) {
                if (!r.has(route["route_short_name"])) {
                    let panelBlock = document.createElement("div");
                    panelBlock.classList.add("panel-block");
                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.checked = true;
                    let i = document.createElement("span");
                    i.classList.add("icon-text");
                    i.style.display = "contents";
                    let icon = document.createElement("span");
                    icon.classList.add("icon");
                    icon.classList.add("is-large");
                    let svg = document.createElement("img");
                    svg.src = `https://carte.tcl.fr/assets/images/lines/${route["route_short_name"]}.svg`
                    icon.appendChild(svg);
                    let iconText = document.createElement("span");
                    iconText.textContent = route["route_long_name"].replace("-->", "<>");
                    iconText.style.color = "#" + route["route_color"];
                    iconText.style.lineHeight = "45px";
                    iconText.style.whiteSpace = "nowrap";
                    i.append(icon, iconText);
                    panelBlock.append(checkbox, i);
                    panelBlock.id = route["route_short_name"];
                    //panel.appendChild(panelBlock);
                    r.set(route["route_short_name"], panelBlock);
                }
            }
            let lineTag = loadingAlert.querySelector(".line-tag");
            lineTag.textContent = `(0/${r.size})`;
            let c = 1;
            r.forEach(function (p) {
                panel.appendChild(p);
                lineTag.textContent = `(${c}/${r.size})`;
                c++;
            });
            lineTag.classList.remove("is-warning");
            lineTag.classList.add("is-success");
            setAllCheckboxDisabled(true);
        } else {
            alert("Received an error when trying to retrieve the GTFS data: HTTP "+response.status);
        }
    }
});

// Stops
$.ajax("gtfs/stops.csv", {
    dataType: "text/csv",

    complete: function (r) {
        if (Math.floor(r.status / 100) === 2) {
            let stops = Papa.parse(r.responseText, {header: true, skipEmptyLines: true}).data;
            let stopTag = loadingAlert.querySelector(".stop-tag");
            stopTag.textContent = `(0/${stops.size})`;
            let markers = [];

            let busStopIcon = L.icon({
                iconUrl: "img/bus-stop.svg",
                iconSize: [28, 28]
            });
            const busStationIcon = L.icon({
                iconUrl: "img/bus-stop-covered.svg",
                iconSize: [30, 30]
            })

            for (const stop of stops) {
                stopTag.textContent = `(${stops.indexOf(stop)+1}/${stops.size})`;
                if (stop["stop_id"].startsWith("S")) {
                    //L.marker([stop["stop_lat"], stop["stop_lon"]]).addTo(stationLayer);
                    let marker = L.marker([stop["stop_lat"], stop["stop_lon"]], {title: `[${stop["stop_id"]}] Station ${stop["stop_name"]}`, icon: busStationIcon});
                    marker.addTo(map);
                    markers.push(marker);
                } else {
                    //L.marker([stop["stop_lat"], stop["stop_lon"]]).addTo(stopLayer);
                    let marker = L.marker([stop["stop_lat"], stop["stop_lon"]], {title: `[${stop["stop_id"]}] Arrêt ${stop["stop_name"]}`, icon: busStopIcon});
                    marker.addTo(map);
                    markers.push(marker);
                }
            }

            function placeMarkers() {
                let mapBounds = map.getBounds();
                for (let i = markers.length -1; i >= 0; i--) {
                    let m = markers[i];
                    let shouldBeVisible = mapBounds.contains(m.getLatLng());
                    if (m._icon && !shouldBeVisible) {
                        map.removeLayer(m);
                    } else if (!m._icon && shouldBeVisible) {
                        map.addLayer(m);
                    }
                    if (map.hasLayer(m)) {
                        if ((!m.options.title.startsWith("[S") && map.getZoom() > 16) || (m.options.title.startsWith("[S") && map.getZoom() <= 16 && map.getZoom() > 14)){
                            map.addLayer(m);
                        } else {
                            map.removeLayer(m);
                        }
                    }
                }
            }

            placeMarkers();

            map.on('zoomend moveend', placeMarkers);
        } else {
            alert("Received an error when trying to retrieve the GTFS data: HTTP "+r.status);
        }
    }
});