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
			zoom: 13,
			center: new google.maps.LatLng(35.1107, -106.6099),
			mapTypeId: google.maps.MapTypeId.HYBRID
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

		this.listenTo(this.locations, 'sync', this.render);
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
	initialize: function() {
		
		// create collections
		this.collections = {
			locations: new FilmLocationCollection([], {})
		};
		
		// fetch data
		this.collections.locations.fetch();
		
		// initialize map
		this.views = {
			heatmap: new FilmHeatMap({
				el: $('#map')[0],
				locations: this.collections.locations
			})
		};
		
	}
});

$(document).ready(function() {
	var app = new FilmLocationsApp();
	window.app = app;
});

})(jQuery)