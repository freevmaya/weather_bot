$(window).ready(()=>{
    // Initialize Windy API
    windyInit({
        key: 'U6SCX0rb7idq442pdke6fY8TwXKVdl2d',
        verbose: true,
        lat: user.lat,
        lon: user.lng,
        zoom: 5,
    }, windyAPI => {

        const { map } = windyAPI;

        map.on('click', function(ev) {

            console.log(ev);

            map.setView(ev.latlng, map.getZoom());

            Ajax({
                action: 'updatePosition',
                data: ev.latlng
            });
        });
    });
});