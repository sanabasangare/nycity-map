function mapviewModel() {
    var self = this;
    var map;
    var service;
    var infowindow;
    var address;
    var markers = [];
    var Location = {};
    var nyc = new google.maps.LatLng(40.761275, -73.965567);


    // The window array for knockout.
    self.placeArray = ko.observableArray([]);

    // This function loads the map.
    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
            center: nyc,
            zoom: 5,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        // Look for attractions within 4500 radius.
        var request = {
            location: nyc,
            radius: 4500,
            types: ['museum', 'attractions', 'art gallery']
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
        var searchBox = new google.maps.places.SearchBox((input));

        google.maps.event.addListener(searchBox, 'places_changed', function() {
            var places = searchBox.getPlaces();
            clearMarkers();
            self.placeArray.removeAll();
            var bounds = new google.maps.LatLngBounds();

            for (var i = 0, place; i <= 10; i++) {
                if (places[i] !== undefined) {
                    place = places[i];
                    Locations(place);
                    addMarker(place);
                    bounds.extend(place.geometry.location);
                }
            }
            map.fitBounds(bounds);

        });
        google.maps.event.addListener(map, 'bounds_changed', function() {
            var bounds = map.getBounds();
            searchBox.setBounds(bounds);
        });


        //Get current NYC Weather in Farenheint

        var url = 'https://query.yahooapis.com/v1/public/yql';
        var yql = 'select title, units.temperature, item.forecast from weather.forecast where woeid in (select woeid from geo.places where text="New York, NY") and u = "F" limit 1| sort(field="item.forecast.date", descending="false");';

        var iconUrl = 'https://s.yimg.com/zz/combo?a/i/us/we/52/';

        $.ajax({ url: url, data: { format: 'json', q: yql }, method: 'GET', dataType: 'json' })
            .success(function(data) {
                if (data.query.count > 1) {
                    jQuery.each(data.query.results.channel, function(idx, result) {
                        console.log(idx);
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
            });

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
        return marker;
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
            });
            map.fitBounds(bounds);
            results.forEach(Locations);
        }
    }

    // Ensures infowindow opens when click.
    self.clickMarker = function(place) {
        var marker;
        for (var i = 0; i < markers.length; i++) {
            if (place.place_id === markers[i].place_id) {
                marker = markers[i];
            }
        }
        map.panTo(marker.position);

        setTimeout(function() {
            var contentString = '<div style="font-weight: 300">' + place.name + '</div><div>' + place.address + '</div>';
            infowindow.setContent(contentString);
            infowindow.open(map, marker);
            marker.setAnimation(google.maps.Animation.DROP);
        }, 300);
    };

    // This Function gets the "Locations" information for knockout.
    function Locations(place) {
        var Location = {};
        Location.place_id = place.place_id;
        Location.position = place.geometry.location.toString();
        Location.name = place.name;

        if (typeof(place.vicinity) !== undefined) {
            address = place.vicinity;
        } else if (typeof(place.formatted_address) !== undefined) {
            address = place.formatted_address;
        }
        Location.address = address;

        self.placeArray.push(Location);
    }

    // Removes the markers from the map when user chose an autocomplete search.
    function clearMarkers() {
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = [];
    }

    // Ensures the location bounds get updated when the page is resized.
    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(nyc);
    });

    // This executes the "initMap" function after the window loads.
    google.maps.event.addDomListener(window, 'load', initMap);

}

$(function() {
    ko.applyBindings(new mapviewModel());
});
