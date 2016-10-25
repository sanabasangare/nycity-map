var markers = [];
var map;
var service;
var infowindow;
var address;
var Location = {};
var nyc;

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


    map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(list);

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
            place.marker = addMarker(place);
            bounds.extend(new google.maps.LatLng(
                place.geometry.location.lat(),
                place.geometry.location.lng()));
            Locations(place);
        });
        map.fitBounds(bounds);
        //results.forEach(Locations);
    }
}

// This Function gets the "Locations" information for knockout.
function Locations(place) {
    var Location = {};
    Location.place_id = place.place_id;
    Location.position = place.geometry.location.toString();
    Location.name = place.name;
    Location.showPlace = ko.observable(true);
    Location.marker = place.marker;

    if (typeof(place.vicinity) !== undefined) {
        address = place.vicinity;
    } else if (typeof(place.formatted_address) !== undefined) {
        address = place.formatted_address;
    }
    Location.address = address;

    vm.placeArray.push(Location);
}

// Adds markers to the map.
function addMarker(place) {
    var img = 'http://maps.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png';
    var marker = new google.maps.Marker({
        map: map,
        name: place.name,
        position: place.geometry.location,
        place_id: place.place_id,
        animation: google.maps.Animation.DROP,
        icon: img
    });

    if (place.vicinity !== undefined) {
        address = place.vicinity;
    } else if (place.formatted_address !== undefined) {
        address = place.formatted_address;
    }
    var contentString = '<div class="strong">' + place.name + '</div><div>' + address + '</div>';

    google.maps.event.addListener(marker, 'click', function() {
        infowindow.setContent(contentString);
        infowindow.open(map, this);
        map.panTo(marker.position);
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 1600);

    });

    markers.push(marker);
    place.marker = marker;
    return marker;
}

// Removes the markers from the map when user chose an autocomplete search.
function clearMarkers() {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}

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
            if (self.placeArray()[i].name.toLowerCase().indexOf(inputValue()) >= 0) {
                self.placeArray()[i].showPlace(true);
                markers[i].setMap(map);
            } else {
                self.placeArray()[i].showPlace(false);
                markers[i].setMap(null);
            }
        }
    });

    // Ensures infowindow opens when click.
    self.clickMarker = function(place) {
        var marker;
        for (var i = 0; i < markers.length; i++) {
            if (place.place_id === markers[i].place_id) {
                marker = markers[i];
            }
        }
        self.getFoursquareInfo(place);
        map.panTo(marker.position);

        setTimeout(function() {
            var contentString = '<div style="font-weight: 600">' + place.name + '</div><div>' + place.address + '</div>' + self.fourSquareAPI;
            infowindow.setContent(contentString);
            infowindow.open(map, marker);
            marker.setAnimation(google.maps.Animation.DROP);
        }, 300);
    };

    // The string to hold foursquare API.
    self.fourSquareAPI = '';

    // Foursquare API
    this.getFoursquareInfo = function(point) {
        var foursquare = 'https://api.foursquare.com/v2/venues/search' +
            '?client_id=2KVAKQAUDSURSUZUEIR0BEMGXOEU3KUB4TLV2GWZ4I2UGFTE' +
            '&client_secret=JIJBDDQOFGOCJLZ2PAICTU134SDLECEJSH0G3R5BT14HVDVN' +
            '&ll=40.761275,-73.965567' +
            '&query=\'' + point['name'] + '\'&limit=10' +
            '&v=20161016';

        //Start ajax and get venues name, phone number and website.
        $.getJSON(foursquare).done(function(response) {
            self.fourSquareAPI = '<hr>' + '<u>Foursquare Info:</u>' + '<br>';
            var venue = response.response.venues[0];
            var venueName = venue.name;

            if (venueName !== null && venueName !== undefined) {
                self.fourSquareAPI += 'Name: ' + venueName + '<br>';
            } else {
                self.fourSquareAPI += venue.name;
            }

            var phoneNumber = venue.contact.formattedPhone;
            if (phoneNumber !== null && phoneNumber !== undefined) {
                self.fourSquareAPI += 'Phone: ' + phoneNumber + ' ';
            } else {
                self.fourSquareAPI += 'Phone not available' + ' ';
            }
        }).fail(function(jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.log("Request Failed, please reload. Error:" + err);
        });
    };
}


var vm = new MapViewModel()
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
    .success(function(data) {
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
