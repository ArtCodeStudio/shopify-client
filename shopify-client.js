/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />
var Api = (function () {
    function Api(config, apiBaseUrl) {
        this.config = config;
        this.apiBaseUrl = apiBaseUrl;
    }
    /**
     * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
     * But wrapped with or own microserive: https://git.mediamor.de/jumplink.eu/microservice-shopify
     */
    Api.prototype.call = function (resource, method, params, callback) {
        var query = $.param(params);
        if (query.length > 0) {
            query = '&' + query;
        }
        var url = this.apiBaseUrl + "/api/" + this.config.appName + "/" + this.config.shopifyApp.shopName + "/" + resource + "/" + method + "?callback=?" + query;
        // console.log('ShopifyClient.api request:', url);
        var jqxhr = $.getJSON(url)
            .done(function (data, textStatus, errorThrown) {
            console.log('ShopifyClient.api result:', data);
            return callback(null, data);
        })
            .fail(function (data, textStatus, errorThrown) {
            console.error(data, textStatus, errorThrown);
            return callback(textStatus);
        });
    };
    ;
    return Api;
}());
var ShopifyClient = (function (_super) {
    __extends(ShopifyClient, _super);
    function ShopifyClient(config, apiBaseUrl) {
        var _this = _super.call(this, config, apiBaseUrl) || this;
        _this.ready = false;
        return _this;
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
        var self = this;
        // console.log('initApi', shopName, firebaseIdToken);
        var url = this.apiBaseUrl + "/init/" + this.config.appName + "/" + shopName + "/" + firebaseIdToken + "?callback=?";
        var jqxhr = $.getJSON(url, function (data, textStatus, jqXHR) {
            // console.log('greate you are signed in. shop:', data);  
            self.ready = true; // TODO use event?
            cb(null, data);
        });
        jqxhr.fail(function (xhr, textStatus, errorThrown) {
            return cb(textStatus);
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
        var self = this;
        var url = this.config.shopifyApp.microserviceAuthBaseUrl + "/token/" + this.config.appName + "/" + shopName + "?callback=?";
        $.getJSON(url, function (data, textStatus, jqXHR) {
            if (data.status === 404) {
                console.error('token not found', data);
                self.getAccess(shopName);
            }
            else if (typeof (data.firebaseToken) === 'string') {
                console.log('microservice-auth result', data);
                self.config.firebase.customToken = data.firebaseToken;
                // this.config.firebase.uid = data.firebaseUid; not needed 
                self.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function (user) {
                    self.config.firebase.user = user;
                    // console.log('firebase user', user);
                    user.getToken(/* forceRefresh */ true).then(function (firebaseIdToken) {
                        // console.log('firebaseIdToken', firebaseIdToken);
                        self.config.firebase.idToken = firebaseIdToken;
                        // Send token to your backend via HTTPS
                        self.initApi(shopName, firebaseIdToken, callback);
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
        var url = this.apiBaseUrl + "/signout/" + this.config.appName + "/" + this.config.shopifyApp.shopName + "?callback=?";
        var jqxhr = $.getJSON(url, function (data, textStatus, jqXHR) {
            // console.log('you are signed out:', data);
            return callback(null, data);
        });
        jqxhr.fail(function (xhr, textStatus, errorThrown) {
            return callback(textStatus);
        });
    };
    ;
    /**
     * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
     */
    ShopifyClient.prototype.api = function (resource, method, params, callback) {
        // console.log('ShopifyClient.api request:', resource, method, params);
        this.call(resource, method, params, callback);
    };
    ;
    return ShopifyClient;
}(Api));
var VideoAPI = (function (_super) {
    __extends(VideoAPI, _super);
    function VideoAPI(config, apiBaseUrl, callback) {
        var _this = _super.call(this, config, apiBaseUrl) || this;
        // this.config = config;
        console.log('VideoAPI.constructor', _this.config);
        var url = _this.apiBaseUrl + "/init/" + _this.config.appName + "/" + _this.config.shopifyApp.shopName + "/" + _this.config.firebase.idToken + "?callback=?";
        var jqxhr = $.getJSON(url, function (data, textStatus, jqXHR) {
            console.log('ShopifyClient.api result:', data);
            return callback(null, data);
        });
        jqxhr.fail(function (xhr, textStatus, errorThrown) {
            return callback(textStatus);
        });
        return _this;
    }
    // MARC: Beispiel, bitte anpassen
    VideoAPI.prototype.api = function (resource, method, params, callback) {
        console.log('VideoAPI.api request:', resource, method, params);
        return this.call(resource, method, params, callback);
    };
    ;
    return VideoAPI;
}(Api));
//# sourceMappingURL=shopify-client.js.map