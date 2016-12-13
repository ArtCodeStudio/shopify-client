/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />
/// <reference path='shopify-client-config.d.ts' />

class VideoAPI {

    public config: IShopifyClientConfig;

    constructor(config: IShopifyClientConfig, callback) {
        this.config = config;
        console.log('VideoAPI.constructor', this.config);

        let url = `${this.config.shopifyApp.microserviceVideoBaseUrl}/init/${this.config.appName}/${this.config.shopifyApp.shopName}/${this.config.firebase.idToken}?callback=?`;

        $.getJSON( url, function( res ) {
            console.log('greate you are signed in to the microservice-video:', res);
            callback(null, res);
        });
    }

    // Beispiel, bitte umändern
    api(resource, method, params, callback): any {

        let url = `${this.config.shopifyApp.microserviceApiBaseUrl}/api/${this.config.appName}/${this.config.shopifyApp.shopName}/${resource}/${method}?callback=?`;
        console.log('ShopifyClient.api request:', url);
        $.getJSON( url, function( result ) {
            console.log('ShopifyClient.api result:', result);
            callback(null, result);
        });
    };
}
