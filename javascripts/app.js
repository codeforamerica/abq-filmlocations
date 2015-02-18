(function($) {

var FilmLocation = Backbone.Model.extend({
	parse: function(response) {
		// keep a handy reference to the lat/lng coordinate
		var geometry = response.geometry;
		var latlng = new google.maps.LatLng(geometry.y, geometry.x);
		if (isNaN(latlng.lat()) || isNaN(latlng.lng())) {
			latlng = null;
		}
		response['_latlng'] = latlng;
		
		// keep a handy reference to the year
		var epoch = response.attributes.ShootDate;
		var d = new Date(epoch);
		var year = d.getUTCFullYear();
		response['_year'] = year;
		
		return response;
	}
});

var FilmLocationCollection = Backbone.Collection.extend({
	model: FilmLocation,
	url: function() {
		var url = '/abq-filmlocations/data/filmlocationsJSON_ALL.json';
		//var url = 'http://coagisweb.cabq.gov/arcgis/rest/services/public/FilmLocations/MapServer/0/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&f=pjson';
		return url;
	},
	parse: function(response) {
		var models = response.features;
		return response.features;
	},
	getArrayCounts: function(arr) {
		// returns a sorted array of objects that contain labels and counts
		var counts = _.chain(arr)
		
			// mapping of each unique label and its corresponding count
			.countBy(function(val) {
				return val;
			})
			
			// convert to array so that we can sort
			.map(function(count, label) {
				return {
					count: count,
					label: label,
					value: label
				};
			})
		
			// sort alphabetically by label
			.sortBy('label')
			
			// add a total at the beginning
			.unshift({
				count: arr.length,
				label: 'All',
				value: ''
			})
			
			// extract the result of the wrapped object
			.value();
		
		return counts;
	},
	getCountsForAttribute: function(attribute) {
		var arr = this.map(function(location) {
			return location.attributes.attributes[attribute];
		});
		return this.getArrayCounts(arr);
	},
	getLatLngs: function() {
		return this.pluck('_latlng');
	},
	getYears: function() {
		return this.pluck('_year');
	},
	getYearsCounts: function() {
		var years = this.getYears();		
		return this.getArrayCounts(years);
	}
});

var FilmHeatMap = Backbone.View.extend({
	initialize: function(options) {
		// collection of FilmLocations
		this.locations = options.locations;
		
		// google map
		var mapOptions = {
			zoom: 11,
			center: new google.maps.LatLng(35.1107, -106.6099),
			mapTypeId: google.maps.MapTypeId.MAP
		};
		this.map = new google.maps.Map(this.el, mapOptions);
		this.heatmap = new google.maps.visualization.HeatmapLayer({
			//dissipating: false,
			opacity: 0.9,
			radius: 20,
			//gradient: ['transparent', 'green', 'blue', 'orange', 'red']
			//gradient: ['transparent', 'red']
			//gradient: ['transparent', '#333', '#666', '#999', '#000']
		});

		this.listenTo(this.locations, 'reset', this.render);
	},
	render: function() {
		this.clear();
		
		var latlngs = this.locations.getLatLngs();
		var pointArray = new google.maps.MVCArray(latlngs);
		
		this.heatmap.setData(pointArray);
		this.heatmap.setMap(this.map);
	},
	clear: function() {
		if (this.heatmap) {
			this.heatmap.setMap(null);
		}
	}
});

var FilmLocationsApp = Backbone.View.extend({
	events: {
		'change #film-type': 'render',
		'change #film-year': 'render',
		'change #film-title': 'render'
	},
		
	initialize: function() {
		
		// DOM elements
		this.$filmType = this.$el.find('#film-type');
		this.$filmYear = this.$el.find('#film-year');
		this.$filmTitle = this.$el.find('#film-title');
		
		// create collections
		this.collections = {
			locations: new FilmLocationCollection([], {}),
			filteredLocations: new FilmLocationCollection([], {})
		};
		
		// initialize map
		this.views = {
			heatmap: new FilmHeatMap({
				el: $('#map')[0],
				locations: this.collections.filteredLocations
			})
		};
		
		// when data from the server comes in
		this.listenTo(this.collections.locations, 'sync', this.onSync);
		
		// fetch data
		this.collections.locations.fetch();

	},
	
	onSync: function() {
		this.populateFilters();
		this.render();
	},
	
	populateFilters: function() {
		var template = _.template($('#filter-option-template').html());
		var locations = this.collections.locations;
		var counts = [];
		var html = '';
		var htmlArray = [];
		
		// film Type
		counts = locations.getCountsForAttribute('Type');
		htmlArray = _.map(counts, function(item) {
			return template(item);
		});
		html = htmlArray.join('');
		this.$filmType.html(html);
		
		// film Year
		counts = locations.getYearsCounts();
		htmlArray = _.map(counts, function(item) {
			return template(item);
		});
		html = htmlArray.join('');
		this.$filmYear.html(html);
		
		// film Title
		counts = locations.getCountsForAttribute('Title');
		htmlArray = _.map(counts, function(item) {
			return template(item);
		});
		html = htmlArray.join('');
		this.$filmTitle.html(html);
	},
	
	render: function() {		
		var filters = [
			{
				id: 'Type',
				val: this.$filmType.val(),
				test: function(location) {
					return (location.get('attributes').Type == this.val)
				}
			},
			{
				id: 'Year',
				val: this.$filmYear.val(),
				test: function(location) {
					return (location.get('_year') == this.val)
				}
			},
			{
				id: 'Title',
				val: this.$filmTitle.val(),
				test: function(location) {
					return (location.get('attributes').Title == this.val)
				}
			}
		];

		// get the new list of results using the filter for the collection
		var results = this.collections.locations.filter(function(location) {
			
			var allFiltersMatch = _.every(filters, function(filter) {
				if (filter.val) {
					return filter.test(location);
				} else {
					// no filter selected, so automatically matches
					return true;
				}
			});
				
			return allFiltersMatch;
		});
		
		// technique from this website:
		// http://tech.pro/tutorial/1519/rendering-a-filtered-backbonecollection
		// reset the filtered collection so that it will update and show the new list
		this.collections.filteredLocations.reset(results);
		
		return this;
	}
});

$(document).ready(function() {
	var app = new FilmLocationsApp({
		el: $('#app')[0]
	});
	window.app = app;
});

})(jQuery)