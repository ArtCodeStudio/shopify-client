if(!shopifyApp) {
    var shopifyApp = {};
}

if(!shopifyApp.video) {
    shopifyApp.video = {};
}

shopifyApp.video.init = function (shopName, firebaseIdToken, callback) {
    console.log("initApi", shopName, firebaseIdToken);
    $.getJSON( config.shopifyApp.microserviceVideoBaseUrl+"/init/"+window.config.appName+"/"+shopName+"/"+firebaseIdToken+"?callback=?", function( res ) {
        console.log("greate you are signed in to the microservice-video:", res);  
        callback(null, res);
    });
};

// Beispiel, bitte umändern
shopifyApp.video.api = function (resource, method, params, callback) {
    $.getJSON( config.shopifyApp.microserviceApiBaseUrl+"/api/"+window.config.appName+"/"+window.config.shopifyApp.shopName+"/"+resource+"/"+method+"?callback=?", function( result ) {
        console.log("api:", result);  
        callback(null, result);
    });
};

