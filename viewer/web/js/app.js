'use strict';

var ehd = {};
(function(ehd, L, $, _) {
	var safeLog10 = function(number) {
		return number === 0 ? 0 : Math.log(Math.abs(number)) / Math.LN10;
	};

	var formatNumber = function(number) {
		var thousand = '.';
		var negative = number < 0 ? "-" : "";
		var absNumber = Math.abs(+number || 0) + "";
		var thousands = (absNumber.length > 3) ? absNumber.length % 3 : 0;
		return negative + (thousands ? absNumber.substr(0, thousands) + thousand : "") + absNumber.substr(thousands).replace(/(\d{3})(?=\d)/g, "$1" + thousand);
	};

	var fillTime = function(timeValue) {
		return (timeValue < 10) ? '0' + timeValue : timeValue;
	};

	var map = {
		areaLayers: [],
		data: [],
		loopUsageData: [],
		districts: [{
			"name": "Mitte",
			"nameForNetUsageApi": "Mitte",
			"ewz": 339974
		}, {
			"name": "Friedrichshain-Kreuzberg",
			"nameForNetUsageApi": "Friedrichshain-Kreuzberg",
			"ewz": 269471
		}, {
			"name": "Pankow",
			"nameForNetUsageApi": "Pankow",
			"ewz": 370937
		}, {
			"name": "Charlottenburg-Wilmersdorf",
			"nameForNetUsageApi": "Charlottenburg-Wilmersdorf",
			"ewz": 319289
		}, {
			"name": "Spandau",
			"nameForNetUsageApi": "Spandau",
			"ewz": 223305
		}, {
			"name": "Steglitz-Zehlendorf",
			"nameForNetUsageApi": "Steglitz-Zehlendorf",
			"ewz": 295746
		}, {
			"name": "Tempelhof-Schöneberg",
			"nameForNetUsageApi": "Tempelhof-Schöneberg",
			"ewz": 328428
		}, {
			"name": "Neukölln",
			"nameForNetUsageApi": "Neukoelln",
			"ewz": 318356
		}, {
			"name": "Treptow-Köpenick",
			"nameForNetUsageApi": "Treptow-Koepenick",
			"ewz": 243844
		}, {
			"name": "Marzahn-Hellersdorf",
			"nameForNetUsageApi": "Marzahn-Hellersdorf",
			"ewz": 251879
		}, {
			"name": "Lichtenberg",
			"nameForNetUsageApi": "Lichtenberg",
			"ewz": 260505
		}, {
			"name": "Reinickendorf",
			"nameForNetUsageApi": "Reinickendorf",
			"ewz": 247887
		}],
		init: function() {
			this.leafletMap = L.map('map', {
				center: [52.51628011262304, 13.37771496361961],
				zoom: 11,
				minZoom: 8,
				maxZoom: 13
			});

			var attribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>, Ortsteil-Geometrien: <a href="https://www.statistik-berlin-brandenburg.de/produkte/opendata/geometrienOD.asp?Kat=6301">Amt für Statistik Berlin-Brandenburg</a> - API: <a href="https://github.com/stefanw/smeterengine-json">stefanw/smeterengine-json</a> - Created by: Michael Hörz, Felix Ebert at <a href="http://energyhack.de">Energy Hackday Berlin</a> - GitHub: <a href="https://github.com/felixebert/energyhack">felixebert/energyhack</a>';
			L.tileLayer('http://{s}.tile.cloudmade.com/036a729cf53d4388a8ec345e1543ef53/44094/256/{z}/{x}/{y}.png', {
				'attribution': attribution,
				'maxZoom': 18
			}).addTo(this.leafletMap);

			$(ehd).on('map.loaded.areaLayers map.loaded.data', _.bind(this.fireMapIsReady, this));
			$(ehd).on('map.ready', _.bind(this.startLoop, this));

			this.loadAreaLayers();
			this.loadData();
		},
		renderLast: function() {
			var districtData = this.getDistrictData(this.lastUsageDataFilter);
			this.colorLayers(districtData);
		},
		startLoop: function() {
			var exampleDistrict = _.first(this.data);
			this.loopUsageData = this.filterOutEmptyData(exampleDistrict.results);
			this.loop();
		},
		loop: function() {
			if (this.loopUsageData.length > 0) {
				var usageData = _.first(this.loopUsageData);
				this.loopUsageData.splice(0, 1);

				var filter = function(usageDataArray) {
					return _.find(usageDataArray, function(usageDataEntry) {
						return usageDataEntry.timestamp === usageData.timestamp;
					});
				};
				var districtData = this.getDistrictData(filter);
				this.colorLayers(districtData);

				window.setTimeout(_.bind(this.loop, this), 1000);
			}
		},
		lastUsageDataFilter: function(usageDataArray) {
			return _.last(usageDataArray);
		},
		getDistrictData: function(usageDataFilter) {
			var districts = [];

			_.each(this.data, _.bind(function(districtData) {
				var district = this.findDistrictByNetUsageApiName(districtData.district);
				var filteredUsageDataArray = this.filterOutEmptyData(districtData.results);
				var usageData = usageDataFilter(filteredUsageDataArray);

				var value = usageData.usage - usageData['key-acount-usage'];
				var ewz = district.ewz;
				var valuePerEwz = Math.round((value * 1000 * 1000) / ewz);

				districts.push({
					'name': district.name,
					'ewz': ewz,
					'usageData': usageData,
					'comparisonValue': valuePerEwz,
					'valuePerEwz': valuePerEwz
				});
			}, this));

			return districts;
		},
		findDistrictByNetUsageApiName: function(districtName) {
			var district = _.find(this.districts, function(districtEntry) {
				return districtEntry.nameForNetUsageApi === districtName;
			});
			return district ? district : null;
		},
		filterOutEmptyData: function(districtResults) {
			return _.filter(districtResults, function(result) {
				return result.usage > 0;
			});
		},
		colorLayers: function(districts) {
			var max = 0;
			var min = 100000;
			_.each(districts, _.bind(function(district) {
				if (district.comparisonValue > max) {
					max = district.comparisonValue;
				}
				if (district.comparisonValue < min && district.comparisonValue > 0) {
					min = district.comparisonValue;
				}
			}, this));
			var log10Boundary = [safeLog10(max), safeLog10(min)];

			_.each(districts, _.bind(function(district) {
				var layer = this.getAreaLayer(district.name);
				if (layer) {
					var style = this.getLayerStyle(district.comparisonValue, log10Boundary);
					var date = new Date(district.usageData.timestamp);
					var html = "Bezirk: <strong>" + district.name + "</strong><br /><br />";
					html += "<table class='table table-condensed table-bordered'>";
					html += "<tr><th style='width:160px'>Zeitpunkt</th><td style='width:70px'>" + fillTime(date.getHours()) + ":" + fillTime(date.getMinutes())
							+ "</td></tr>";
					html += "<tr><th>Erzeugte Energie</th><td>" + (Math.round(district.usageData.generation * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Verbrauch absolut</th><td>" + (Math.round(district.usageData.usage * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>High Voltage Customers</th><td>" + (Math.round(district.usageData['key-acount-usage'] * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Verbrauch abzgl. HVC</th><td>"
							+ (Math.round((district.usageData.usage - district.usageData['key-acount-usage']) * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Einwohnerzahl</th><td>" + formatNumber(district.ewz) + "</td></tr>";
					html += "<tr><th>Verbrauch / Einwohner*</th><td>" + district.valuePerEwz + " Watt</td></tr>";
					html += "</table><em>* maßgebend für die Einfärbung des Bezirks</em>";

					_.each(this.areaLayers, _.bind(function(area) {
						if (area.key === district.name) {
							area.value.setStyle(style);
							area.value.bindPopup(html);
						}
					}, this));
				} else {
					console.error('no layer for district ' + district.name);
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
				return '#FF0000';
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
				$('#loading').remove();
				$(ehd).triggerHandler('map.ready');
			}
		},
		loadAreaLayers: function() {
			$.getJSON('data/Berlin-Ortsteile.geojson', _.bind(function(data) {
				this.addAreaLayers(data);
				$(ehd).triggerHandler('map.loaded.areaLayers');
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
		getDistrictNamesForNetUsageApi: function() {
			var result = [];
			_.each(this.districts, function(district) {
				result.push(district.nameForNetUsageApi);
			});
			return result;
		},
		loadData: function() {
			var params = {
				district: this.getDistrictNamesForNetUsageApi()
			};
			var url = 'http://pure-headland-2592.herokuapp.com/?' + $.param(params, true);
			$.getJSON(url, _.bind(function(data) {
				this.data = data;
				$(ehd).triggerHandler('map.loaded.data');
			}, this));
		}
	};

	ehd.map = map;
})(ehd, L, $, _);