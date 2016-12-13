if(!shopifyApp) {
    var shopifyApp = {};
}

if(!shopifyApp.video) {
    shopifyApp.video = {};
}

shopifyApp.video.init = function (shopName, firebaseIdToken, callback) {
    console.log("initApi", shopName);

    $.getJSON( shopifyApp.config.shopifyApp.microserviceVideoBaseUrl+"/init/"+shopifyApp.config.appName+"/"+shopName+"/"+firebaseIdToken+"?callback=?", function( res ) {
        console.log("greate you are signed in to the microservice-video:", res);  
        callback(null, res);
    });
};

// Beispiel, bitte umändern
shopifyApp.video.api = function (resource, method, params, callback) {
    $.getJSON( shopifyApp.config.shopifyApp.microserviceApiBaseUrl+"/api/"+shopifyApp.config.appName+"/"+shopifyApp.config.shopifyApp.shopName+"/"+resource+"/"+method+"?callback=?", function( result ) {
        console.log("api:", result);  
        callback(null, result);
    });
};

