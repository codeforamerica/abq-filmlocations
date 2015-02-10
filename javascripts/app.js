(function($) {

var FilmLocation = Backbone.Model.extend({
	defaults: {
		'_marker': null
	}
});

var FilmLocationCollection = Backbone.Collection.extend({
	model: FilmLocation,
	url: function() {
		var url = '/abq-filmlocations/data/filmlocationsJSON_ALL.json';
		return url;
	},
	parse: function(response) {
		var models = response.features;
		return response.features;
	}
});

var FilmHeatMap = Backbone.View.extend({
	initialize: function() {
		var mapOptions = {
			zoom: 13,
			center: new google.maps.LatLng(35.1107, -106.6099),
			mapTypeId: google.maps.MapTypeId.SATELLITE
		};
		this.map = new google.maps.Map(this.el, mapOptions);
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
		
	}
});

$(document).ready(function() {
	var app = new FilmLocationsApp();
	window.app = app;
});

})(jQuery)