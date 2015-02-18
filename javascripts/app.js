(function($) {

var FilmLocation = Backbone.Model.extend({
	parse: function(response) {
		var geometry = response.geometry;
		var latlng = new google.maps.LatLng(geometry.y, geometry.x);
		if (isNaN(latlng.lat()) || isNaN(latlng.lng())) {
			latlng = null;
		}
		response['_latlng'] = latlng;
		return response;
	}
});

var FilmLocationCollection = Backbone.Collection.extend({
	model: FilmLocation,
	url: function() {
		//var url = '/abq-filmlocations/data/filmlocationsJSON_ALL.json';
		var url = 'http://coagisweb.cabq.gov/arcgis/rest/services/public/FilmLocations/MapServer/0/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&f=pjson';
		return url;
	},
	parse: function(response) {
		var models = response.features;
		return response.features;
	},
	getLatLngs: function() {
		return this.pluck('_latlng');
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
		'change #film-year': 'render'
	},
		
	initialize: function() {
		
		// DOM elements
		this.$filmType = this.$el.find('#film-type');
		
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
		var template = _.template($('#film-type-template').html());
		var locations = this.collections.locations;
		
		// mapping of film Type and corresponding count
		var filmTypes = locations.countBy(function(location) {
			return location.attributes.attributes.Type
		});
		
		// convert to array so that we can sort
		var filmTypesArray = _.map(filmTypes, function(count, filmType) {
			return {
				count: count,
				type: filmType,
				value: filmType
			};
		});
		
		// sort alphabetically by type
		filmTypesArray = _.sortBy(filmTypesArray, 'type');
		
		// add a total at the beginning
		filmTypesArray.unshift({
			count: locations.length,
			type: 'All',
			value: ''
		});
		
		// get a combined HTML string of the templatized items
		var htmlArray = _.map(filmTypesArray, function(item) {
			return template(item);
		});
		var html = htmlArray.join('');
		
		// render in DOM
		this.$filmType.html(html);
	},
	
	render: function() {
		// technique from this website:
		// http://tech.pro/tutorial/1519/rendering-a-filtered-backbonecollection
		
		// status of the filters
		var filteredType = this.$filmType.val();

		// get the new list of results using the filter for the collection
		var results = this.collections.locations.filter(function(location) {			
			var matchesType = false;
			if (filteredType) {
				var type = location.get('attributes').Type;
				matchesType = (type == filteredType);
			} else {
				matchesType = true;
			}
			return matchesType;
		});
		
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