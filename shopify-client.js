/// <reference path='node_modules/@types/jquery/index.d.ts' />
// <reference path='node_modules/@types/underscore/index.d.ts' />
// <reference path='node_modules/@types/es6-promise/index.d.ts' />
/// <reference path='shopifyEASDK.d.ts' />
// <reference path='firebase.d.ts' />
/// <reference path='shopify-client-config.d.ts' />
// import * as _ from 'node_modules/@types/underscore/index';
var ShopifyClient = (function () {
    function ShopifyClient(config) {
        this.ready = false;
        this.config = config;
    }
    /**
     * Identify if a webpage is being loaded inside an iframe or directly into the browser window
     * @see http://stackoverflow.com/a/326076
     */
    ShopifyClient.prototype.inIframe = function () {
        try {
            return window.self !== window.top;
        }
        catch (e) {
            return true;
        }
    };
    /**
     * Get the values from URL GET parameters
     *
     * @see http://stackoverflow.com/a/1099670
     */
    ShopifyClient.prototype.getQueryParams = function (qs) {
        qs = qs.split('+').join(' ');
        var params = {}, tokens, re = /[?&]?([^=]+)=([^&]*)/g;
        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }
        return params;
    };
    ShopifyClient.prototype.initEmbeddedSDK = function (protocol, shop, callback) {
        var initSDKConfig = {
            apiKey: this.config.shopifyApp.apiKey,
            shopOrigin: protocol + shop,
            debug: this.config.debug
        };
        var thisObj = this;
        // console.log('init Embedded SDK with config', initSDKConfig);
        ShopifyApp.init(initSDKConfig);
        // should be ready after success auth
        ShopifyApp.ready(function () {
            // console.log('READY YEA!');
            thisObj.signIn(thisObj.config.shopifyApp.shopName, function (error, initApiRes) {
                if (error) {
                    callback(error, initApiRes);
                    console.error(new Error(error));
                    return thisObj.getAccess(thisObj.config.shopifyApp.shopName);
                }
                callback(null, initApiRes);
            });
        });
    };
    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     *
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     */
    ShopifyClient.prototype.initShopify = function (protocol, shop, shopName, callback) {
        // console.log('initShopify', protocol, shop, shopName);
        // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
        if (this.inIframe()) {
            // console.log('Backend is in iframe');
            this.initEmbeddedSDK(protocol, shop, callback);
        }
        else {
            console.error('Backend is not in iframe');
            this.getAccess(shopName); // get access and redirect back to the shopify app page
        }
    };
    ShopifyClient.prototype.initFirebase = function () {
        // console.log('initFirebase');
        return this.firebase = firebase.initializeApp(this.config.firebase);
    };
    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     */
    ShopifyClient.prototype.getShopName = function (shop) {
        return shop.substring(0, shop.indexOf('.'));
    };
    ;
    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP
     */
    ShopifyClient.prototype.getShop = function (shopName) {
        return shopName + '.myshopify.com';
    };
    ;
    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopifyApp
     */
    ShopifyClient.prototype.setShop = function (shop) {
        this.config.shopifyApp.shop = shop;
        this.config.shopifyApp.shopName = this.getShopName(this.config.shopifyApp.shop);
        // console.log('setShop', shop, this.config.shopifyApp);
    };
    ;
    /**
     * Set the shop domain and shop name by the shop name in this.config.shopifyApp
     */
    ShopifyClient.prototype.setShopName = function (shopName) {
        this.config.shopifyApp.shop = this.getShop(shopName);
        this.config.shopifyApp.shopName = shopName;
        // console.log('setShopName', shopName, this.config.shopifyApp);
    };
    ;
    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     *
     */
    ShopifyClient.prototype.getAccess = function (shopName) {
        // console.log('getAccess', shopName);
        var accessRedirectUrl = this.config.shopifyApp.microserviceAuthBaseUrl + "/redirect/" + this.config.appName + "/" + shopName;
        // if in iframe redirect parent site
        if (this.inIframe()) {
            window.top.location.href = accessRedirectUrl;
        }
        else {
            window.location.href = accessRedirectUrl;
        }
    };
    ;
    ShopifyClient.prototype.initApi = function (shopName, firebaseIdToken, cb) {
        var thisObj = this;
        // console.log('initApi', shopName, firebaseIdToken);
        var url = this.config.shopifyApp.microserviceApiBaseUrl + "/init/" + this.config.appName + "/" + shopName + "/" + firebaseIdToken + "?callback=?";
        $.getJSON(url, function (data, textStatus, jqXHR) {
            // console.log('greate you are signed in. shop:', data);  
            // TODO check error
            thisObj.ready = true; // TODO use event?
            cb(null, data);
        });
    };
    ;
    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.getAccess with redirections
     *
     */
    ShopifyClient.prototype.signIn = function (shopName, callback) {
        // console.log('signIn');
        this.initFirebase();
        var thisObj = this;
        var url = this.config.shopifyApp.microserviceAuthBaseUrl + "/token/" + this.config.appName + "/" + shopName + "?callback=?";
        $.getJSON(url, function (data, textStatus, jqXHR) {
            if (data.status === 404) {
                console.error('token not found', data);
                thisObj.getAccess(shopName);
            }
            else if (typeof (data.firebaseToken) === 'string') {
                console.log('microservice-auth result', data);
                thisObj.config.firebase.customToken = data.firebaseToken;
                // this.config.firebase.uid = data.firebaseUid; not needed 
                thisObj.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function (user) {
                    thisObj.config.firebase.user = user;
                    // console.log('firebase user', user);
                    user.getToken(/* forceRefresh */ true).then(function (firebaseIdToken) {
                        // console.log('firebaseIdToken', firebaseIdToken);
                        thisObj.config.firebase.idToken = firebaseIdToken;
                        // Send token to your backend via HTTPS
                        thisObj.initApi(shopName, firebaseIdToken, callback);
                    }).catch(function (error) {
                        // Handle error
                        callback(error);
                    });
                }).catch(function (error) {
                    // Handle Errors here.
                    callback(error);
                });
            }
            else {
                console.error(new Error('Das hätte nicht passieren dürfen, bitte Microservice überprüfen.'));
            }
        });
    };
    ;
    ShopifyClient.prototype.singOut = function (accessToken, callback) {
        var url = this.config.shopifyApp.microserviceApiBaseUrl + "/signout/" + this.config.appName + "/" + this.config.shopifyApp.shopName + "?callback=?";
        $.getJSON(url, function (data, textStatus, jqXHR) {
            console.log('you are signed out:', data);
        });
    };
    ;
    ShopifyClient.prototype.api = function (resource, method, params, callback) {
        var url = this.config.shopifyApp.microserviceApiBaseUrl + "/api/" + this.config.appName + "/" + this.config.shopifyApp.shopName + "/" + resource + "/" + method + "?callback=?";
        console.log('ShopifyClient.api request:', url);
        $.getJSON(url, function (data, textStatus, jqXHR) {
            console.log('ShopifyClient.api result:', data);
            callback(null, data);
        });
    };
    ;
    return ShopifyClient;
}());
//# sourceMappingURL=shopify-client.js.map