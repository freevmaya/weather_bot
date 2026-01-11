var dateTinyFormat  = "dd.MM HH:mm";
var dateShortFormat = "dd.MM.yy HH:mm";
var dateLongFormat  = "dd.MM.yyyy HH:mm";
var dateOnlyFormat  = "dd.MM.yyyy";
var HMSFormat  = "HH:mm:ss";
var HMFormat  = "HH:mm";

var STATELIST = ['wait', 'accepted', 'driver_move', 'wait_meeting', 'execution', 'finished', 'expired', 'rejected', 'cancel'];

var STATES = 'wait accepted driver_move wait_meeting execution finished expired rejected cancel';


var currentPathOptions = {
    preserveViewport: false,
    suppressMarkers: false,
    markerOptions: {
        clickable: true,
        opacity: 0.5
    },
    polylineOptions: {
        strokeColor: 'green'
    }
}

var driverPathOptions = {
    preserveViewport: false,
    suppressMarkers: true,
    //draggable: true,
    markerOptions: {
        clickable: true,
        opacity: 0.5
    },
    polylineOptions: {
        strokeColor: '#AA0',
        strokeWeight: 3
    }
}

var driverOrderPathOptions = {
    preserveViewport: false,
    suppressMarkers: true,
    polylineOptions: {
        strokeColor: 'red',
        strokeWeight: 5
    }
}

var pathToStartOptions = {
    preserveViewport: false,
    suppressMarkers: true,
    polylineOptions: {
        strokeColor: 'yellow'
    }
}

var defaultPathOptions = {
    preserveViewport: true,
    suppressMarkers: false,
    markerOptions: {
        clickable: true,
        opacity: 0.5
    },
    polylineOptions: {
        strokeColor: 'green'
    }
}

const MAXDISTANCEFORMEETING = 20;
const MAXPERIODWAITMEETING = 2 * 60;
const SLOWSPEED_KM_H = 40;
const SOONDELTASEC = 30 * 60;
const NOWDELTASEC = 10 * 60;
const WAITOFFERS = 30; //сек

const windowsLayerId = 'windows';
const modalLayerId = 'modal-windows';