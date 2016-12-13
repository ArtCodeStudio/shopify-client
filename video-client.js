/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />
/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />
/// <reference path='shopify-client-config.d.ts' />
var VideoAPI = (function () {
    function VideoAPI(config, callback) {
        this.config = config;
        console.log('initApi', this.config);
        var url = this.config.shopifyApp.microserviceVideoBaseUrl + "/init/" + this.config.appName + "/" + this.config.shopifyApp.shopName + "/" + this.config.firebase.idToken + "?callback=?";
        $.getJSON(url, function (res) {
            console.log('greate you are signed in to the microservice-video:', res);
            callback(null, res);
        });
    }
    // Beispiel, bitte umändern
    VideoAPI.prototype.api = function (resource, method, params, callback) {
        var url = this.config.shopifyApp.microserviceApiBaseUrl + "/api/" + this.config.appName + "/" + this.config.shopifyApp.shopName + "/" + resource + "/" + method + "?callback=?";
        $.getJSON(url, function (result) {
            console.log('api:', result);
            callback(null, result);
        });
    };
    ;
    return VideoAPI;
}());
//# sourceMappingURL=video-client.js.map