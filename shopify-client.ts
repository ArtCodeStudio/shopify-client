/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />
declare var firebase: Firebase; // allready created in october



interface IShopifyClientConfigFirebase {
    apiKey: string;
    authDomain: string;
    customToken?: string;
    databaseURL: string;
    idToken?: string;
    messagingSenderId?: string;
    storageBucket: string;
    user?: any; // TODO firebase user Object and move to class
}

interface IShopifyClientConfigShopify {
    apiKey: string;
    microserviceApiBaseUrl: string;
    microserviceAuthBaseUrl: string;
    microserviceVideoBaseUrl: string;
    protocol: string;
    shop: string;
    shopName: string;
}

interface IShopifyClientConfig {
    firebase: IShopifyClientConfigFirebase;
    shopifyApp: IShopifyClientConfigShopify;
    debug: boolean;
}

class ShopifyClient {

    config: IShopifyClientConfig;

    constructor(config: IShopifyClientConfig) {
        this.config = config;
    }

    /**
     * Identify if a webpage is being loaded inside an iframe or directly into the browser window
     * @see http://stackoverflow.com/a/326076
     */
    inIframe(): boolean {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    /**
     * Get the values from URL GET parameters
     * 
     * @see http://stackoverflow.com/a/1099670
     */
    getQueryParams(qs): any {
        qs = qs.split('+').join(' ');

        let params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    initEmbeddedSDK(protocol, shop, callback) {
        let initSDKConfig = {
            apiKey: this.config.shopifyApp.apiKey,
            shopOrigin: protocol + shop,
            debug: this.config.debug
        };

        // console.log('init Embedded SDK with config', initSDKConfig);

        ShopifyApp.init(initSDKConfig);

        // should be ready after success auth
        ShopifyApp.ready(function () {
            // console.log('READY YEA!');

            this.signIn(this.config.shopifyApp.shopName, function(error, initApiRes) {
                if(error) {
                    callback(null, error);
                    console.error(new Error(error));
                    return this.getAccess(this.config.shopifyApp.shopName);
                }
                callback(null, initApiRes);

            });
        });

    }

    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     * 
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     */
    initShopify = function (protocol, shop, shopName, callback) {
        // console.log('initShopify', protocol, shop, shopName);

        // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
        if(this.inIframe()) {
            // console.log('Backend is in iframe');
            this.initEmbeddedSDK(protocol, shop, callback);
        } else {
            console.error('Backend is not in iframe');
            this.getAccess(shopName); // get access and redirect back to the shopify app page
        }
    }

    initFirebase = function  () {
        // console.log('initFirebase');
        this.firebase = firebase.initializeApp(this.config.firebase);
    }


    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     */
    getShopName = function (shop) {
        return shop.substring(0, shop.indexOf('.'));
    };

    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP 
     */
    getShop = function (shopName) {
        return shopName + '.myshopify.com';
    };


    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopifyApp
     */
    setShop = function (shop) {
        this.config.shopifyApp.shop = shop;
        this.config.shopifyApp.shopName = this.getShopName(this.config.shopifyApp.shop);
        // console.log('setShop', shop, this.config.shopifyApp);
    };

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopifyApp
     */
    setShopName = function (shopName) {
        this.config.shopifyApp.shop = this.getShop(shopName);
        this.config.shopifyApp.shopName = shopName;
        // console.log('setShopName', shopName, this.config.shopifyApp);
    };

    /**
     * Set the access token in config.shopifyApp
     */
    setToken = function (accessToken) {
        this.config.shopifyApp.accessToken = accessToken;
    };

    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     * 
     */
    getAccess = function (shopName) {
        // console.log('getAccess', shopName);
        let accessRedirectUrl = this.config.shopifyApp.microserviceAuthBaseUrl + '/redirect/' + this.config.appName + '/' + shopName;

        // if in iframe redirect parent site
        if(this.inIframe()) {
            window.top.location.href = accessRedirectUrl;
        } else {
            window.location.href = accessRedirectUrl;
        }
    };

    initApi = function (shopName, firebaseIdToken, callback) {
        // console.log('initApi', shopName, firebaseIdToken);

        $.getJSON( this.config.shopifyApp.microserviceApiBaseUrl+'/init/'+this.config.appName+'/'+shopName+'/'+firebaseIdToken+'?callback=?', (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('greate you are signed in. shop:', data);  
            callback(null, data);
        });
    };

    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.getAccess with redirections
     * 
     */
    signIn = function (shopName, callback) {
        // console.log('signIn');

        this.initFirebase();

        $.getJSON( this.config.shopifyApp.microserviceAuthBaseUrl+'/token/'+this.config.appName+'/'+shopName+'?callback=?', (data: any, textStatus: string, jqXHR: JQueryXHR) => {

            if (data.status === 404) {
                console.error('token not found', data );
                this.getAccess(shopName);
            } else if (_.isString(data.firebaseToken)) {

                // console.log('token', data.firebaseToken );

                this.config.firebase.customToken = data.firebaseToken;
                // this.config.firebase.uid = data.firebaseUid; not needed 

                this.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function (user) {
                    this.config.firebase.user = user;
                    // console.log('firebase user', user);
                    user.getToken(/* forceRefresh */ true).then(function(firebaseIdToken) {
                        // console.log('firebaseIdToken', firebaseIdToken);
                        this.config.firebase.idToken = firebaseIdToken;
                        // Send token to your backend via HTTPS
                        this.initApi(shopName, firebaseIdToken, callback);

                    }).catch(function(error) {
                        // Handle error
                        callback(error);
                    });

                }).catch(function(error) {
                    // Handle Errors here.
                    callback(error);
                });
            } else {
                console.error(new Error('Das hätte nicht passieren dürfen, bitte Microservice überprüfen.'));
            }

        });
    };

    singOut = function (accessToken, callback) {
        $.getJSON( this.config.shopifyApp.microserviceApiBaseUrl+'/signout/'+this.config.appName+'/'+this.config.shopifyApp.shopName+'?callback=?', (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            console.log('you are signed out:', data);  
        });
    };

    api = function (resource, method, params, callback) {
            // console.log('service:', this.config.shopifyApp.microserviceApiBaseUrl+'/api/'+this.config.appName+'/'+this.config.shopifyApp.shopName+'/'+resource+'/'+method+'?callback=?');
            $.getJSON( this.config.shopifyApp.microserviceApiBaseUrl+'/api/'+this.config.appName+'/'+this.config.shopifyApp.shopName+'/'+resource+'/'+method+'?callback=?', (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            console.log('api:', data);  
            callback(null, data);
        });
    };

}