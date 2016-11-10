var markers = [];
var map;
var service;
var infowindow;
var address;
var Location = {};
var nyc;

// The string to hold foursquare API.
foursquareString = '';

// This function loads the map.
function initMap() {
    nyc = new google.maps.LatLng(40.761275, -73.965567);
    map = new google.maps.Map(document.getElementById('map'), {});
    // Look for attractions within 4500 radius.
    var request = {
        location: nyc,
        radius: 10000,
        types: ['museum', 'attractions', 'art gallery', 'points of interest']
    };

    // MTA Transit data layer
    var transitLayer = new google.maps.TransitLayer();
    transitLayer.setMap(map);

    // Location information is provided in the marker’s infoWindow.
    infowindow = new google.maps.InfoWindow();

    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callback);

    // list the attractions.
    var list = (document.getElementById('list'));
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(list);

    // Toggle the list & input.
    var toggle = document.getElementById("toggle");
    toggle.addEventListener("click", function() {
        list.style.display = (list.dataset.toggled ^= 1) ? "block" : "none";
        input.style.display = (input.dataset.toggled ^= 1) ? "block" : "none";
    }, false);

    var input = (document.getElementById('input'));
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(input);

    // Ensures the location bounds get updated when the page is resized.
    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(nyc);
    });
}

// Get results for each location.
function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        bounds = new google.maps.LatLngBounds();
        results.forEach(function(place) {
            bounds.extend(new google.maps.LatLng(
                place.geometry.location.lat(),
                place.geometry.location.lng()));
            Locations(place);
        });
        map.fitBounds(bounds);
        //results.forEach(Locations);
    }
}

// This Function gets the "Location" information for knockout.
function Locations(place) {
    var Location = {};
    Location.place_id = place.place_id;
    Location.position = place.geometry.location.toString();
    Location.name = place.name;
    Location.showPlace = ko.observable(true);
    Location.marker = place.marker;
    Location.position = place.geometry.location;

    if (typeof(place.vicinity) !== undefined) {
        address = place.vicinity;
    } else if (typeof(place.formatted_address) !== undefined) {
        address = place.formatted_address;
    }
    Location.address = address;
    Location.marker = addMarker(Location);

    vm.placeArray.push(Location);
}

// Adds markers to the map.
function addMarker(Location) {
    var img = 'http://maps.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png';
    var marker = new google.maps.Marker({
        map: map,
        name: Location.name,
        position: Location.position,
        place_id: Location.place_id,
        animation: google.maps.Animation.DROP,
        icon: img,
    });

    google.maps.event.addListener(marker, 'click', function() {
        map.panTo(marker.position);
        getFoursquareInfo(Location, marker);

    });

    markers.push(marker);
    return marker;
}

// This removes the markers from the map when user chose an autocomplete search.
function clearMarkers() {
    markers.forEach(function(marker) {});
    setVisible(true | false)
}
markers = [];

//Main map view model.
function MapViewModel() {
    var self = this;
    var Input = document.getElementById('input');

    // The array for knockout.
    self.placeArray = ko.observableArray([]);
    self.query = ko.observable('');

    // Filter markers
    var input = ko.computed(function() {
        var inputValue = self.query;
        for (var i = 0; i < self.placeArray().length; i++) {
            var place = self.placeArray()[i];
            var match = place.name.toLowerCase().indexOf(inputValue()) >= 0;
            place.showPlace(match);
            place.marker.setVisible(match);
        }
    });

    // Ensures infowindow opens when click.
    self.clickMarker = function(place) {
        google.maps.event.trigger(place.marker, 'click');
    };
}

// Foursquare API
var getFoursquareInfo = function(point, marker) {
    var foursquare = 'https://api.foursquare.com/v2/venues/search' +
        '?client_id=2KVAKQAUDSURSUZUEIR0BEMGXOEU3KUB4TLV2GWZ4I2UGFTE' +
        '&client_secret=JIJBDDQOFGOCJLZ2PAICTU134SDLECEJSH0G3R5BT14HVDVN' +
        '&ll=40.761275,-73.965567' +
        '&query=\'' + point['name'] + '\'&limit=10' +
        '&v=20161016';

    //Start ajax and get venues name and phone number.
    $.getJSON(foursquare).done(function(response) {
        var foursquareString = '<hr>' + '<u>Foursquare Info:</u>' + '<br>';
        var venue = response.response.venues[0];

        var venueName = venue.name;
        if (venueName !== null && venueName !== undefined) {
            foursquareString += 'Name: ' + venueName + '<br>';
        } else {
            foursquareString += venue.name;
        }

        var phoneNumber = venue.contact.formattedPhone;
        if (phoneNumber !== null && phoneNumber !== undefined) {
            foursquareString += 'Phone: ' + phoneNumber + ' ';
        } else {
            foursquareString += 'Phone not available' + ' ';
        }

        var contentString = '<div style="font-weight: 600">' + point.name + '</div><div>' + point.address + '</div>' + foursquareString;
        infowindow.setContent(contentString);
        infowindow.open(map, marker);
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 2100);
    }).fail(function(jqxhr) {
        alert("A location info request Failed, please reload.");
    });
};


var vm = new MapViewModel();
ko.applyBindings(vm);

//Get current NYC Weather in Farenheint
var url = 'https://query.yahooapis.com/v1/public/yql';
var yql = 'select title, units.temperature, ' +
    'item.forecast from weather.forecast ' +
    'where woeid in (select woeid from geo.places where text="New York, NY") ' +
    'and u = "F" limit 1| sort(field="item.forecast.date", descending="false");';

var iconUrl = 'https://s.yimg.com/zz/combo?a/i/us/we/52/';

$.ajax({
        url: url,
        data: {
            format: 'json',
            q: yql
        },
        method: 'GET',
        dataType: 'json'
    })
    .done(function(data) {
        if (data.query.count > 1) {
            jQuery.each(data.query.results.channel, function(idx, result) {
                var f = result.item.forecast;
                var u = result.units.temperature;

                var c = $('#weather').clone();
                c.find('.weather_date').text(f.date);
                c.find('.weather_temp_min').text(f.low + u);
                c.find('.weather_temp_max').text(f.high + u);
                c.find('.weather_icon').attr('src', iconUrl + f.code + '.gif');
                c.find('.weather_text').text(f.text);

                c.css('display', 'inline-block');

                c.appendTo($('body'));
            });
        } else {
            var f = data.query.results.channel.item.forecast;
            var u = data.query.results.channel.units.temperature;

            var c = $('#weather').clone();
            c.find('.weather_date').text(f.date);
            c.find('.weather_temp_min').text(f.low + u);
            c.find('.weather_temp_max').text(f.high + u);
            c.find('.weather_icon').attr('src', iconUrl + f.code + '.gif');
            c.find('.weather_text').text(f.text);

            c.css('display', 'inline-block');

            c.appendTo($('body'));
        }
    }).fail(function(jqxhr) {
        alert("The weather forecast could not be updated, please refresh.");
    });

$(document).ready(function() {
    $("input").keydown(function() {
        $("input").css("background-color", "#6CF");
    });
    $("input").keyup(function() {
        $("input").css("background-color", "#000");
    });
});
