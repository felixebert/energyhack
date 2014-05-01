'use strict';

var ehd = {};
(function(ehd, L, $, _, Modernizr) {
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

	var toLiteral = function(array) {
		var literal = {};
		_.each(array, function(element) {
			literal[element.name] = element.value;
		});
		return literal;
	};

	var colors = {
		red: ["#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"],
		green: ["#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"]
	};

	var playControl = L.Control.extend({
		options: {
			position: 'topleft'
		},

		onAdd: function(map) {
			var playName = 'leaflet-control-time';
			var barName = 'leaflet-bar';
			var partName = barName + '-part';

			var container = L.DomUtil.create('div', playName);
			var buttonContainer = L.DomUtil.create('div', barName, container);

			this._map = map;
			this._playButton = this._createButton('<i class="icon-play"></i>', 'Play', playName + '-play ' + partName, buttonContainer, this._play, this);

			L.DomUtil.create('span', 'time', container);
			return container;
		},

		_play: function(e) {
			map.startLoop();
		},

		_createButton: function(html, title, className, container, fn, context) {
			var link = L.DomUtil.create('a', className, container);
			link.innerHTML = html;
			link.href = '#';
			link.title = title;

			var stop = L.DomEvent.stopPropagation;

			L.DomEvent.on(link, 'click', stop).on(link, 'mousedown', stop).on(link, 'dblclick', stop).on(link, 'click', L.DomEvent.preventDefault).on(link,
					'click', fn, context);

			return link;
		}
	});

	var map = {
		areaLayers: [],
		data: [],
		loopUsageData: [],
		loopBoundary: [],
		settings: {},
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
			if (!Modernizr.svg || !Modernizr.cors) {
				alert('Diese Visualisierung nutzt Techniken, die von Ihrem aktuellen Browser nicht unterstützt werden. Bitte aktualisieren Sie Ihren Browser! Für Internet Explorer Nutzer: Es ist mindestens Version 10 erforderlich.');
				$('#loading').remove();
				return false;
			}

			this.leafletMap = L.map('map', {
				center: [52.51628011262304, 13.37771496361961],
				zoom: 11,
				minZoom: 10,
				maxZoom: 14
			});

			var attribution = '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>, Ortsteil-Geometrien: <a href="https://www.statistik-berlin-brandenburg.de/produkte/opendata/geometrienOD.asp?Kat=6301">Amt für Statistik Berlin-Brandenburg</a> &amp; <a href="https://github.com/m-hoerz/berlin-shapes">m-hoerz/berlin-shapes</a> - Energiedaten: <a href="http://netzdaten-berlin.de/web/guest/suchen/-/details/web-service-last-und-erzeugung-berlin">Stromnetz Berlin</a> - API: <a href="https://github.com/stefanw/smeterengine-json">stefanw/smeterengine-json</a> - Created by: <a href="http://www.michael-hoerz.de/">Michael Hörz</a>, Felix Ebert at <a href="http://energyhack.de">Energy Hackday Berlin</a> - GitHub: <a href="https://github.com/felixebert/energyhack">felixebert/energyhack</a>';
			L.tileLayer('https://{s}.tiles.mapbox.com/v3/felix-ebert.i4fh1iml/{z}/{x}/{y}.png', {
				'attribution': attribution,
				'maxZoom': 18
			}).addTo(this.leafletMap);

			new playControl().addTo(this.leafletMap);

			$(ehd).on('map.loaded.areaLayers map.loaded.data', _.bind(this.fireMapIsReady, this));
			$(ehd).on('map.ready', _.bind(this.renderLast, this));

			$('.settings').on('change', _.bind(this.onSettingsChange, this));
			this.settings = toLiteral($('.settings').serializeArray());

			this.loadAreaLayers();
			this.loadData();
		},
		onSettingsChange: function() {
			this.settings = toLiteral($('.settings').serializeArray());
			if (this.loopUsageData.length <= 1) {
				this.renderLast();
			} else {
				this.setLoopBoundary();
			}
		},
		renderLast: function() {
			var districtData = this.getDistrictData(this.lastUsageDataFilter);
			var log10Boundary = this.getLog10Boundary(districtData);
			this.colorLayers(districtData, log10Boundary);
			this.showTimeOf(_.first(districtData));
		},
		showTimeOf: function(district) {
			var date = new Date(district.usageData.timestamp);
			var time = fillTime(date.getHours()) + ":" + fillTime(date.getMinutes());
			$('.time').text(time);
		},
		startLoop: function() {
			var exampleDistrict = _.first(this.data);
			var startLoop = this.loopUsageData.length < 1;

			this.loopUsageData = this.filterOutEmptyData(exampleDistrict.results);
			this.setLoopBoundary();

			if (startLoop) {
				this.loop();
			}
		},
		setLoopBoundary: function() {
			var boundary = [0, 100000];
			_.each(this.loopUsageData, _.bind(function(usageData) {
				var filter = function(usageDataArray) {
					return _.find(usageDataArray, function(usageDataEntry) {
						return usageDataEntry.timestamp === usageData.timestamp;
					});
				};
				var districtData = this.getDistrictData(filter);
				var log10Boundary = this.getLog10Boundary(districtData);
				if (log10Boundary[0] > boundary[0]) {
					boundary[0] = log10Boundary[0];
				}
				if (log10Boundary[1] < boundary[1]) {
					boundary[1] = log10Boundary[1];
				}
			}, this));
			this.loopBoundary = boundary;
		},
		loop: function() {
			if (this.loopUsageData.length > 0) {
				var usageData = _.first(this.loopUsageData);
				this.loopUsageData.splice(0, 1);

				var filter = function(usageDataArray) {
					var value = _.find(usageDataArray, function(usageDataEntry) {
						return usageDataEntry.timestamp === usageData.timestamp;
					});
					return value === null ? {} : value;
				};
				var districtData = this.getDistrictData(filter);
				this.colorLayers(districtData, this.loopBoundary);

				this.showTimeOf(_.first(districtData));
				window.setTimeout(_.bind(this.loop, this), 750);
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
				usageData.hvc = Math.max(0, usageData['key-acount-usage']);
				usageData.usageWithoutHvc = usageData.usage - usageData.hvc;

				var ewz = district.ewz;
				var usageByPopulation = Math.round((usageData.usageWithoutHvc * 1000 * 1000) / ewz);

				var comparisonValue = usageData[this.settings.compare];
				if (this.settings.relation === 'population') {
					comparisonValue = Math.round((comparisonValue * 1000 * 1000) / ewz);
				}

				districts.push({
					'name': district.name,
					'ewz': ewz,
					'usageData': usageData,
					'comparisonValue': comparisonValue,
					'comparisonValueUnit': this.settings.relation === 'population' ? 'W' : 'MW',
					'usageByPopulation': usageByPopulation
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
		getLog10Boundary: function(districts) {
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
			return log10Boundary;
		},
		colorLayers: function(districts, log10Boundary) {
			_.each(districts, _.bind(function(district) {
				var layer = this.getAreaLayer(district.name);
				if (layer) {
					var style = this.getLayerStyle(district.comparisonValue, log10Boundary);
					var date = new Date(district.usageData.timestamp);
					var html = "Bezirk: <strong>" + district.name + "</strong><br /><br />";
					html += "<table class='table table-condensed table-bordered'>";
					html += "<tr><th style='width:160px'>Zeitpunkt</th><td style='width:70px'>" + fillTime(date.getDate()) + '.'
							+ fillTime(date.getMonth() + 1) + '.2013 ' + fillTime(date.getHours()) + ":" + fillTime(date.getMinutes()) + "</td></tr>";
					html += "<tr><th>Erzeugte Energie</th><td>" + (Math.round(district.usageData.generation * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Verbrauch absolut</th><td>" + (Math.round(district.usageData.usage * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>High Voltage Customers</th><td>" + (Math.round(district.usageData['key-acount-usage'] * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Verbrauch abzgl. HVC</th><td>"
							+ (Math.round((district.usageData.usage - district.usageData['key-acount-usage']) * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Einwohnerzahl</th><td>" + formatNumber(district.ewz) + "</td></tr>";
					html += "<tr><th>Verbrauch / Einwohner</th><td>" + district.usageByPopulation + " Watt</td></tr>";
					html += "</table><em>maßgebender Wert für die Einfärbung: " + Math.round(district.comparisonValue * 100) / 100 + " "
							+ district.comparisonValueUnit + "</em>";

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
				'fillOpacity': 0.65,
				'fillColor': this.getFillColor(value, log10Boundary)
			};
		},
		getFillColor: function(value, log10Boundary) {
			if (value == 0) {
				return '#EEE';
			}

			var colorScheme = (value <= 0 || this.settings.compare === 'generation') ? colors.green : colors.red;
			var factor = this.getComparisonFactor(value, log10Boundary);
			var colorIndex = Math.max(0, Math.round((colorScheme.length - 1) * factor));
			return colorScheme[colorIndex];
		},
		getOpacity: function(value, log10Boundary) {
			if (value === 0) {
				return 0.25;
			}
			var opacity = Math.round(0.75 * this.getComparisonFactor(value, log10Boundary) * 100) / 100;
			return Math.max(0.2, opacity);
		},
		getComparisonFactor: function(value, log10Boundary) {
			if (log10Boundary[0] === log10Boundary[1]) {
				return 1;
			}
			return Math.round((safeLog10(value) - log10Boundary[1]) / (log10Boundary[0] - log10Boundary[1]) * 100) / 100;
		},
		fireMapIsReady: function() {
			if (!_.isEmpty(this.data) && !_.isEmpty(this.areaLayers)) {
				$('#loading').remove();
				$(ehd).triggerHandler('map.ready');
			}
		},
		loadAreaLayers: function() {
			$.getJSON('data/Berlin-Bezirke.geojson', _.bind(function(data) {
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
			this.areaLayers.push({
				'key': feature.properties.Name,
				'label': feature.properties.Name,
				'value': layer
			});
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
			var errorOccured = false;
			var handleData = function(data) {
				this.data = data;

				var someDistrict = _.first(this.data);
				var filledData = this.filterOutEmptyData(someDistrict.results);
				if (filledData.length < 1) {
					var warning = 'Die API von Stromnetz Berlin liefert aktuell leider keine Livedaten. - bis zur Behebung des Fehlers werden Daten von Dienstag, den 18. Juni 2013, angezeigt.';
					alert(warning);

					if (!errorOccured) {
						errorOccured = true;
						url += '&begin=2013-06-18%2000:00:00&end=2013-06-18%2023:59:59';
						$.getJSON(url, _.bind(handleData, this));
					}
				} else {
					$(ehd).triggerHandler('map.loaded.data');
				}
			};
			$.getJSON(url, _.bind(handleData, this));
		}
	};

	ehd.map = map;
})(ehd, L, $, _, Modernizr);