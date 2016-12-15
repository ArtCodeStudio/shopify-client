/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />

declare interface IShopifyClientConfigFirebase extends Object {
    apiKey: string,
    authDomain: string,
    databaseURL: string,
    storageBucket: string,
    messagingSenderId?: string;

    customToken?: string;
    idToken?: string;
    user?: any; // TODO firebase user Object and move to class
}

declare interface IShopifyClientConfigShopify extends Object {
    apiKey: string;
    microserviceAuthBaseUrl: string;
    protocol: string;
    shop: string;
    shopName: string;
}

declare interface IShopifyClientConfig extends Object {
    appName: string;
    firebase: IShopifyClientConfigFirebase;
    shopifyApp: IShopifyClientConfigShopify;
    debug: boolean;
}

class Api {

    config: IShopifyClientConfig;

    apiBaseUrl: string;

    constructor(config: IShopifyClientConfig, apiBaseUrl: string) {
        this.config = config;
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
     * But wrapped with or own microserive: https://git.mediamor.de/jumplink.eu/microservice-shopify
     */
    call (resource: string, method: string, params: any, callback: (error?: any, data?: any) => void ): void {
        let query = $.param(params);

        if (query.length > 0) {
            query = '&' + query;
        }

        let url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopifyApp.shopName}/${resource}/${method}?callback=?${query}`;
        // console.log('ShopifyClient.api request:', url);
        let jqxhr = $.getJSON( url)
        .done(function(data: JQueryXHR, textStatus: string, errorThrown: string) {
            console.log('ShopifyClient.api result:', data);
            return callback(null, data);
        })
        .fail((data: JQueryXHR, textStatus: string, errorThrown: string) => {
            console.error(data, textStatus, errorThrown);
            return callback(textStatus);
        });
    };
}

class ShopifyClient extends Api {

    public firebase: any; // firebase.app.App

    public ready: boolean = false;

    constructor(config: IShopifyClientConfig, apiBaseUrl: string) {
        super(config, apiBaseUrl);
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
    getQueryParams(qs: string): Object {
        qs = qs.split('+').join(' ');

        let params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    initEmbeddedSDK(protocol: string, shop: string, callback: (error?: any, data?: any) => void): any {
        let initSDKConfig = {
            apiKey: this.config.shopifyApp.apiKey,
            shopOrigin: protocol + shop,
            debug: this.config.debug
        };

        let thisObj = this;

        // console.log('init Embedded SDK with config', initSDKConfig);

        ShopifyApp.init(initSDKConfig);

        // should be ready after success auth
        ShopifyApp.ready(function () {
            // console.log('READY YEA!');

            thisObj.signIn(thisObj.config.shopifyApp.shopName, function(error, initApiRes) {
                if(error) {
                    callback(error, initApiRes);
                    console.error(new Error(error));
                    return thisObj.getAccess(thisObj.config.shopifyApp.shopName);
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
    initShopify(protocol: string, shop: string, shopName: string, callback: (error?: any, data?: any) => void): void {
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

    initFirebase(): any { // firebase.app.App {
        // console.log('initFirebase');
        return this.firebase = firebase.initializeApp(this.config.firebase);
    }


    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     */
    getShopName (shop: string): string {
        return shop.substring(0, shop.indexOf('.'));
    };

    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP 
     */
    getShop (shopName: string): string {
        return shopName + '.myshopify.com';
    };


    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopifyApp
     */
    setShop (shop: string): void {
        this.config.shopifyApp.shop = shop;
        this.config.shopifyApp.shopName = this.getShopName(this.config.shopifyApp.shop);
        // console.log('setShop', shop, this.config.shopifyApp);
    };

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopifyApp
     */
    setShopName (shopName: string): void {
        this.config.shopifyApp.shop = this.getShop(shopName);
        this.config.shopifyApp.shopName = shopName;
        // console.log('setShopName', shopName, this.config.shopifyApp);
    };

    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     * 
     */
    getAccess (shopName: string): void {
        // console.log('getAccess', shopName);
        let accessRedirectUrl = `${this.config.shopifyApp.microserviceAuthBaseUrl}/redirect/${this.config.appName}/${shopName}`;

        // if in iframe redirect parent site
        if (this.inIframe()) {
            window.top.location.href = accessRedirectUrl;
        } else {
            window.location.href = accessRedirectUrl;
        }
    };

    initApi (shopName: string, firebaseIdToken: string, cb: (error: any, data?: any) => void ): void {
        let self = this;
        // console.log('initApi', shopName, firebaseIdToken);
        let url = `${this.apiBaseUrl}/init/${this.config.appName}/${shopName}/${firebaseIdToken}?callback=?`;
        let jqxhr = $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('greate you are signed in. shop:', data);  
            self.ready = true; // TODO use event?
            cb(null, data);
        });

        jqxhr.fail((xhr: JQueryXHR, textStatus: string, errorThrown: string) => {
            return cb(textStatus);
        });
    };

    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.getAccess with redirections
     * 
     */
    signIn (shopName: string, callback: (error?: any, data?: any) => void ): void {
        // console.log('signIn');

        this.initFirebase();
        let self = this;

        let url = `${this.config.shopifyApp.microserviceAuthBaseUrl}/token/${this.config.appName}/${shopName}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {

            if (data.status === 404) {
                console.error('token not found', data );
                self.getAccess(shopName);
            } else if (typeof(data.firebaseToken) === 'string') {

                console.log('microservice-auth result', data );

                self.config.firebase.customToken = data.firebaseToken;
                // this.config.firebase.uid = data.firebaseUid; not needed 

                self.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function (user) {
                    self.config.firebase.user = user;
                    // console.log('firebase user', user);
                    user.getToken(/* forceRefresh */ true).then(function(firebaseIdToken) {
                        // console.log('firebaseIdToken', firebaseIdToken);
                        self.config.firebase.idToken = firebaseIdToken;
                        // Send token to your backend via HTTPS
                        self.initApi(shopName, firebaseIdToken, callback);

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

    singOut (accessToken: string, callback: (error?: any, data?: any) => void ): void {
        let url = `${this.apiBaseUrl}/signout/${this.config.appName}/${this.config.shopifyApp.shopName}?callback=?`;
        let jqxhr = $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('you are signed out:', data);
            return callback(null, data);
        });

        jqxhr.fail((xhr: JQueryXHR, textStatus: string, errorThrown: string) => {
            return callback(textStatus);
        });
    };

    /**
     * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
     */
    api (resource: string, method: string, params: any, callback: (error?: any, data?: any) => void ): void {
        // console.log('ShopifyClient.api request:', resource, method, params);
        this.call(resource, method, params, callback);
    };
}

class VideoAPI extends Api {

    public config: IShopifyClientConfig;

    constructor(config: IShopifyClientConfig, apiBaseUrl: string, callback) {
        super(config, apiBaseUrl);
        // this.config = config;
        console.log('VideoAPI.constructor', this.config);

        let url = `${this.apiBaseUrl}/init/${this.config.appName}/${this.config.shopifyApp.shopName}/${this.config.firebase.idToken}?callback=?`;

        let jqxhr = $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            console.log('ShopifyClient.api result:', data);
            return callback(null, data);
        });

        jqxhr.fail((xhr: JQueryXHR, textStatus: string, errorThrown: string) => {
            return callback(textStatus);
        });

    }

    // MARC: Beispiel, bitte anpassen
    api(resource, method, params, callback): any {

        console.log('VideoAPI.api request:', resource, method, params);

        return this.call(resource, method, params, callback);
    };
}
