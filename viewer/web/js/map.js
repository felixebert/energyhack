'use strict';
(function(hdv, L, $, _) {
	var safeLog10 = function(number) {
		return number === 0 ? 0 : Math.log(Math.abs(number)) / Math.LN10;
	};

	var map = {
		translate: {
			'Treptow-Koepenick': 'Treptow-Köpenick',
			'Neukoelln': 'Neukölln',
			'Tempelhof-Schöneberg': 'Tempelhof-Schöneberg'
		},
		areaLayers: [],
		data: {},
		ewz: [{
			"Bezirk": "Mitte",
			"Einwohnerzahl": 339974
		}, {
			"Bezirk": "Friedrichshain-Kreuzberg",
			"Einwohnerzahl": 269471
		}, {
			"Bezirk": "Pankow",
			"Einwohnerzahl": 370937
		}, {
			"Bezirk": "Charlottenburg-Wilmersdorf",
			"Einwohnerzahl": 319289
		}, {
			"Bezirk": "Spandau",
			"Einwohnerzahl": 223305
		}, {
			"Bezirk": "Steglitz-Zehlendorf",
			"Einwohnerzahl": 295746
		}, {
			"Bezirk": "Tempelhof-Schöneberg",
			"Einwohnerzahl": 328428
		}, {
			"Bezirk": "Neukölln",
			"Einwohnerzahl": 318356
		}, {
			"Bezirk": "Treptow-Köpenick",
			"Einwohnerzahl": 243844
		}, {
			"Bezirk": "Marzahn-Hellersdorf",
			"Einwohnerzahl": 251879
		}, {
			"Bezirk": "Lichtenberg",
			"Einwohnerzahl": 260505
		}, {
			"Bezirk": "Reinickendorf",
			"Einwohnerzahl": 247887
		}],
		init: function() {
			this.leafletMap = L.map('map', {
				center: [52.51628011262304, 13.37771496361961],
				zoom: 11,
				minZoom: 8,
				maxZoom: 11
			});

			L.tileLayer('http://{s}.tile.cloudmade.com/036a729cf53d4388a8ec345e1543ef53/44094/256/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 18
			}).addTo(this.leafletMap);

			$(hdv).on('map.loaded.areaLayers map.loaded.data', _.bind(this.fireMapIsReady, this));
			$(hdv).on('map.ready', _.bind(this.colorLayers, this));

			this.loadAreaLayers();
			this.loadData();
		},
		colorLayers: function() {
			var districts = [];

			_.each(this.data, _.bind(function(district) {
				var districtName = district.district['@name'];
				var areaKey = this.translate[districtName] ? this.translate[districtName] : districtName;

				var usageData = _.last(district.district.period.districtTimestampData);

				var usage = usageData ? usageData.usage : 0;
				var value = usageData ? usageData.usage - usageData['key-acount-usage'] : 0;
				var ewz = _.find(this.ewz, function(ewzEntry) {
					return ewzEntry.Bezirk === areaKey;
				})['Einwohnerzahl'];
				var valuePerEwz = Math.round((value * 1000 * 1000) / ewz);
				var timestamp = usageData ? usageData['@value'] : '?';

				districts.push({
					'name': areaKey,
					'usage': usage,
					'value': value,
					'usageWKAU': value,
					'valuePerEwz': valuePerEwz,
					'ewz': ewz,
					'timestamp': timestamp
				});
			}, this));

			var max = 0;
			var min = 100000;
			_.each(districts, _.bind(function(district) {
				if (district.value > max) {
					max = district.value;
				}
				if (district.value < min && district.value > 0) {
					min = district.value;
				}
			}, this));

			var log10Boundary = [safeLog10(max), safeLog10(min)];

			_.each(districts, _.bind(function(district) {
				var layer = this.getAreaLayer(district.name);
				if (layer) {
					var style = this.getLayerStyle(district.value, log10Boundary);
					var html = "<strong>" + district.name + "</strong><br />Zeitpunkt: " + district.timestamp + "<br />Verbrauch absolut: "
							+ (Math.round(district.usage * 100) / 100) + " MW<br />Verbrauch abzgl. Industrie: " + (Math.round(district.usageWKAU * 100) / 100)
							+ " MW<br />Einwohnerzahl: " + hdv.formatter.currency(district.ewz) + "<br /><strong>Verbrauch / Einwohner</strong>: "
							+ district.valuePerEwz + " Watt";

					_.each(this.areaLayers, _.bind(function(area) {
						if (area.key == district.name) {
							area.value.setStyle(style);
							area.value.bindPopup(html);
						}
					}, this));
				} else {
					console.error('no layer for area ' + district.name);
				}
			}, this));
		},
		getLayerStyle: function(value, log10Boundary) {
			return {
				'fillOpacity': this.getOpacity(value, log10Boundary),
				'fillColor': this.getFillColor(value)
			};
		},
		getFillColor: function(value, compare) {
			if (value == 0) {
				return '#888';
			} else {
				return '#00C957';
			}
		},
		getOpacity: function(value, log10Boundary) {
			if (value === 0) {
				return 0.25;
			}
			var opacity = Math.round(0.75 * this.getOpacityFactor(value, log10Boundary) * 100) / 100;
			return Math.max(0.2, opacity);
		},
		getOpacityFactor: function(value, log10Boundary) {
			return Math.round((safeLog10(value) - log10Boundary[1]) / (log10Boundary[0] - log10Boundary[1]) * 100) / 100;
		},
		fireMapIsReady: function() {
			if (!_.isEmpty(this.data) && !_.isEmpty(this.areaLayers)) {
				$(hdv).triggerHandler('map.ready');
			}
		},
		loadAreaLayers: function() {
			$.getJSON('data/Berlin-Ortsteile.geojson', _.bind(function(data) {
				this.addAreaLayers(data);
				$(hdv).triggerHandler('map.loaded.areaLayers');
			}, this));
		},
		addAreaLayers: function(geojson) {
			L.geoJson(geojson.features, {
				style: {
					'opacity': 0.5,
					'weight': 1
				},
				onEachFeature: _.bind(this.addAreaLayer, this)
			}).addTo(this.leafletMap);
		},
		addAreaLayer: function(feature, layer) {
			var key = this.extractKey(feature.properties.Description);
			this.areaLayers.push({
				'key': key,
				'label': feature.properties.Name,
				'value': layer
			});
		},
		extractKey: function(description) {
			var startPos = description.indexOf('BEZNAME');
			var substr = description.substr(startPos + 17, 100);
			var key = substr.substr(0, substr.indexOf('<'));
			return key;
		},
		getAreaLayer: function(key) {
			return _.find(this.areaLayers, function(area) {
				return area.key == key;
			});
		},
		loadData: function() {
			$.getJSON('data/data.json', _.bind(function(data) {
				this.data = data;
				$(hdv).triggerHandler('map.loaded.data');
			}, this));
		}
	};

	hdv.map = map;
})(hdv, L, $, _);