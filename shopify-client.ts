
/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

// /// <reference path='assets/vendor/firebase/firebase.d.ts' />
/// <reference path='firebase.d.ts' />

import { shopify } from './shopifyEASDK';

declare let ShopifyApp: shopify.EASDK;

export class ShopifyClientConfigFirebase extends Object {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    storageBucket: string;
    messagingSenderId?: string;

    customToken?: string;
    idToken?: string;
    user?: any; // TODO firebase user Object and move to class
}

export class ShopifyClientConfigShopify extends Object {
    apiKey: string;
    protocol: string;
    shop: string;
    shopName: string;
}

export class ShopifyClientConfig extends Object {
    appName: string;
    firebase: ShopifyClientConfigFirebase;
    shopify: ShopifyClientConfigShopify;
    debug: boolean;
}

export class Api {

    config: ShopifyClientConfig;

    apiBaseUrl: string;

    constructor(config: ShopifyClientConfig, apiBaseUrl: string) {
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

        let url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/${resource}/${method}?callback=?${query}`;
        console.log('Api.call request:', url);
        let jqxhr = $.getJSON( url)
        .done(function(data: JQueryXHR, textStatus: string, errorThrown: string) {
            // console.log('Api.call result:', data);
            return callback(null, data);
        })
        .fail((data: JQueryXHR, textStatus: string, errorThrown: string) => {
            console.error(data, textStatus, errorThrown);
            return callback(textStatus);
        });
    };
}

export class ShopifyClient extends Api {

    public firebase: firebase.app.App;

    public ready: boolean = false;
    authBaseUrl: string;

    /**
     * Cache api results
    */
    cache: any = {
        listAllProduct: {}
    };

    constructor(config: ShopifyClientConfig, apiBaseUrl: string, authBaseUrl: string) {
        super(config, apiBaseUrl);
        this.authBaseUrl = authBaseUrl;
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
     * Chjeck if SDK is ready
     */
    isReady(): boolean {
        return this.ready;
    }

    /**
     * Get the values from URL GET parameters
     * 
     * @see http://stackoverflow.com/a/1099670
     */
    getQueryParams(qs: string): any {
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
            apiKey: this.config.shopify.apiKey,
            shopOrigin: protocol + shop,
            debug: this.config.debug
        };

        let self = this;

        // console.log('init Embedded SDK with config', initSDKConfig);

        ShopifyApp.init(initSDKConfig);

        // should be ready after success auth
        ShopifyApp.ready(function () {
            // console.log('READY YEA!');

            self.signIn(self.config.shopify.shopName, function(error, initApiRes) {
                if(error) {
                    callback(error, initApiRes);
                    console.error(new Error(error));
                    return self.getAccess(self.config.shopify.shopName);
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
     * Set the shop domain and shop name by the shop domain in this.config.shopify
     */
    setShop (shop: string): void {
        this.config.shopify.shop = shop;
        this.config.shopify.shopName = this.getShopName(this.config.shopify.shop);
        // console.log('setShop', shop, this.config.shopify);
    };

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopify
     */
    setShopName (shopName: string): void {
        this.config.shopify.shop = this.getShop(shopName);
        this.config.shopify.shopName = shopName;
        // console.log('setShopName', shopName, this.config.shopify);
    };

    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     * 
     */
    getAccess (shopName: string): void {
        console.log('getAccess', shopName);
        let accessRedirectUrl = `${this.authBaseUrl}/redirect/${this.config.appName}/${shopName}`;

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

        let url = `${this.authBaseUrl}/token/${this.config.appName}/${shopName}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {

            if (data.status === 404) {
                console.error('token not found', data );
                self.getAccess(shopName);
            } else if (typeof(data.firebaseToken) === 'string') {

                // console.log('microservice-auth result', data );

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
        let url = `${this.apiBaseUrl}/signout/${this.config.appName}/${this.config.shopify.shopName}?callback=?`;
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
        let self = this;
        if (self.ready) {
            console.warn('api: ', resource, method);
            self.call(resource, method, params, callback);
            return;
        } else {
            console.warn(new Error('api not ready, try again..'));
            // WORKAROUND need better Solution
            setTimeout(() => {
                self.api(resource, method, params, callback);
                return;
            }, 3000);
        }
    };

    deleteMetafield(id, callback: (error?: any, data?: any) => void) {
        let self = this;
        self.api('metafield', 'delete', id, ( err , result) => {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    }

    deleteAllMetafield(ids: Array<Number>, callback: (error?: any, data?: any) => void) {
        let self = this;

        console.log('deleteAllMetafield', ids);
        self.api('metafield', 'deleteAll', {ids: ids}, ( err , result) => {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    }

    listMetafieldByProduct(productId, callback: (error?: any, data?: any) => void) {
        let self = this;
        self.api('metafield', 'list', {
            metafield: {
                owner_resource: 'product',
                owner_id: productId
            }
        }, ( err , productMetafields) => {
            if (err) {
                return callback(err);
            }
            return callback(null, productMetafields);
        });
    }

    listAllProduct(cache, fields, callback: (error?: any, data?: any) => void) {
        // console.log('listAllProduct', cache, fields);
        let self = this;
        if (cache && self.cache && self.cache.listAllProduct && self.cache.listAllProduct[fields]) {
            return callback(null, self.cache.listAllProduct[fields]);
        }
        self.api('product', 'listAll', {fields: fields}, (error, data) => {
            if (!error && cache) {
                self.cache.listAllProduct[fields] = data;
            }
            callback(error, data);
        });
    }


}

export class VideoAPI extends Api {

    constructor(config: ShopifyClientConfig, apiBaseUrl: string, callback) {
        super(config, apiBaseUrl);
        // this.config = config;
        // console.log('VideoAPI.constructor', this.config);

        let url = `${this.apiBaseUrl}/init/${this.config.appName}/${this.config.shopify.shopName}/${this.config.firebase.idToken}?callback=?`;

        let jqxhr = $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('ShopifyClient.api result:', data);
            return callback(null, data);
        });

        jqxhr.fail((xhr: JQueryXHR, textStatus: string, errorThrown: string) => {
            return callback(textStatus);
        });

    }

    // api(resource, method, params, callback): any {

    //     return this.call(resource, method, params, callback);
    // };

    /**
     *  target url: api/:appName/:shopName/thumbnail/delete 
     */
    public createThumbnail( dataURL: string, shopName: string, productID: string ) {
        return new Promise( ( resolve, reject ) => {
            resolve('OK');
        });
    };

    /**
     *  server route : api/product-videos/:shopName/videos/get
     *  eg: https://dev.video.api.jumplink.eu/api/product-videos/anita-hass-2/videos/get
     */
    public getVimeoVideos() {

        let resource = 'videos';
        let method = 'get';

        return new Promise( (resolve, reject) => {
            this.call( 'videos', 'get', {
                a: "none",
            }, (error, result) => {
                // console.info('...getVimeoVideos resolve', result);
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * server route : api/product-videos/:shopName/videos/set
     * /api/:appName/:shopName/product/update 
     */
    public setShopifyMetadata( vimeoVideo:VimeoVideo ) {

        let resource = 'product';
        // let method = 'update';
        // let params = downloadURL;

        // return new Promise( (resolve, reject) => {
        //     this.call( 'video', 'convert', {
        //         productID: productID,
        //         downloadURL: downloadURL,
        //         shopifyAccessToken: shopifyAccessToken //from firebase
        //     }, () => {
        //         resolve(); // no return value needed atm
        //     });
        // });
    }

    /**
     * server route : 
     * /api/:appName/:shopName/video/convert
     */
    public convertVideo( downloadURL, productID, shopifyAccessToken ): Promise<any> {

        let resource = 'video';
        let method = 'convert';
        let params = downloadURL;

        return new Promise( (resolve, reject) => {
            this.call( 'video', 'convert', {
                productID: productID,
                downloadURL: downloadURL,
                shopifyAccessToken: shopifyAccessToken //from firebase
            }, () => {
                resolve(); // no return value needed atm
            });
        });
    }

    /**
     *    call: self.videoAPI.deleteVideo(self.selectedProductID, self.config.firebase.idToken, (error, result) => {
     */
    public deleteVideo(productID, firebaseIdToken, callback): any {
        let resource = 'video';
        let method = 'delete';
        return this.call(resource, method, {
            productID: productID,
            firebaseIdToken: firebaseIdToken,
        }, callback);
    };
=======
/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

// /// <reference path='assets/vendor/firebase/firebase.d.ts' />
/// <reference path='firebase.d.ts' />

import { shopify } from './shopifyEASDK';

declare let ShopifyApp: shopify.EASDK;

export class ShopifyClientConfigFirebase extends Object {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    storageBucket: string;
    messagingSenderId?: string;

    customToken?: string;
    idToken?: string;
    user?: any; // TODO firebase user Object and move to class
}

export class ShopifyClientConfigShopify extends Object {
    apiKey: string;
    protocol: string;
    shop: string;
    shopName: string;
}

export class ShopifyClientConfig extends Object {
    appName: string;
    firebase: ShopifyClientConfigFirebase;
    shopify: ShopifyClientConfigShopify;
    debug: boolean;
}

export class Api {

    config: ShopifyClientConfig;

    apiBaseUrl: string;

    constructor(config: ShopifyClientConfig, apiBaseUrl: string) {
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

        let url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/${resource}/${method}?callback=?${query}`;
        // console.log('Api.call request:', url);
        let jqxhr = $.getJSON( url)
        .done(function(data: JQueryXHR, textStatus: string, errorThrown: string) {
            // console.log('Api.call result:', data);
            return callback(null, data);
        })
        .fail((data: JQueryXHR, textStatus: string, errorThrown: string) => {
            console.error(data, textStatus, errorThrown);
            return callback(textStatus);
        });
    };
}

export class ShopifyClient extends Api {

    public firebase: firebase.app.App;

    public ready: boolean = false;
    authBaseUrl: string;

    /**
     * Cache api results
    */
    cache: any = {
        listAllProduct: {}
    };

    constructor(config: ShopifyClientConfig, apiBaseUrl: string, authBaseUrl: string) {
        super(config, apiBaseUrl);
        this.authBaseUrl = authBaseUrl;
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
     * Chjeck if SDK is ready
     */
    isReady(): boolean {
        return this.ready;
    }

    /**
     * Get the values from URL GET parameters
     * 
     * @see http://stackoverflow.com/a/1099670
     */
    getQueryParams(qs: string): any {
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
            apiKey: this.config.shopify.apiKey,
            shopOrigin: protocol + shop,
            debug: this.config.debug
        };

        let self = this;

        // console.log('init Embedded SDK with config', initSDKConfig);

        ShopifyApp.init(initSDKConfig);

        // should be ready after success auth
        ShopifyApp.ready(function () {
            // console.log('READY YEA!');

            self.signIn(self.config.shopify.shopName, function(error, initApiRes) {
                if(error) {
                    callback(error, initApiRes);
                    console.error(new Error(error));
                    return self.getAccess(self.config.shopify.shopName);
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
     * Set the shop domain and shop name by the shop domain in this.config.shopify
     */
    setShop (shop: string): void {
        this.config.shopify.shop = shop;
        this.config.shopify.shopName = this.getShopName(this.config.shopify.shop);
        // console.log('setShop', shop, this.config.shopify);
    };

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopify
     */
    setShopName (shopName: string): void {
        this.config.shopify.shop = this.getShop(shopName);
        this.config.shopify.shopName = shopName;
        // console.log('setShopName', shopName, this.config.shopify);
    };

    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     * 
     */
    getAccess (shopName: string): void {
        console.log('getAccess', shopName);
        let accessRedirectUrl = `${this.authBaseUrl}/redirect/${this.config.appName}/${shopName}`;

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

        let url = `${this.authBaseUrl}/token/${this.config.appName}/${shopName}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {

            if (data.status === 404) {
                console.error('token not found', data );
                self.getAccess(shopName);
            } else if (typeof(data.firebaseToken) === 'string') {

                // console.log('microservice-auth result', data );

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
        let url = `${this.apiBaseUrl}/signout/${this.config.appName}/${this.config.shopify.shopName}?callback=?`;
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
        let self = this;
        if (self.ready) {
            console.warn('api: ', resource, method);
            self.call(resource, method, params, callback);
            return;
        } else {
            console.warn(new Error('api not ready, try again..'));
            // WORKAROUND need better Solution
            setTimeout(() => {
                self.api(resource, method, params, callback);
                return;
            }, 3000);
        }
    };

    deleteMetafield(id, callback: (error?: any, data?: any) => void) {
        let self = this;
        self.api('metafield', 'delete', id, ( err , result) => {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    }

    deleteAllMetafield(ids: Array<Number>, callback: (error?: any, data?: any) => void) {
        let self = this;

        console.log('deleteAllMetafield', ids);
        self.api('metafield', 'deleteAll', {ids: ids}, ( err , result) => {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    }

    listMetafieldByProduct(productId, callback: (error?: any, data?: any) => void) {
        let self = this;
        self.api('metafield', 'list', {
            metafield: {
                owner_resource: 'product',
                owner_id: productId
            }
        }, ( err , productMetafields) => {
            if (err) {
                return callback(err);
            }
            return callback(null, productMetafields);
        });
    }

    listAllProduct(cache, fields, callback: (error?: any, data?: any) => void) {
        // console.log('listAllProduct', cache, fields);
        let self = this;
        if (cache && self.cache && self.cache.listAllProduct && self.cache.listAllProduct[fields]) {
            return callback(null, self.cache.listAllProduct[fields]);
        }
        self.api('product', 'listAll', {fields: fields}, (error, data) => {
            if (!error && cache) {
                self.cache.listAllProduct[fields] = data;
            }
            callback(error, data);
        });
    }


}

export class VideoAPI extends Api {

    // public config: ShopifyClientConfig;
    // private _firebase;

    constructor(config: ShopifyClientConfig, apiBaseUrl: string, callback) {
        super(config, apiBaseUrl);
        // this.config = config;
        // console.log('VideoAPI.constructor', this.config);

        let url = `${this.apiBaseUrl}/init/${this.config.appName}/${this.config.shopify.shopName}/${this.config.firebase.idToken}?callback=?`;

        let jqxhr = $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('ShopifyClient.api result:', data);
            return callback(null, data);
        });

        jqxhr.fail((xhr: JQueryXHR, textStatus: string, errorThrown: string) => {
            return callback(textStatus);
        });

        // this.initFirebase();

    }

    initFirebase() {
        console.info('VideoAPI initFirebase');
        // return this._firebase = firebase.initializeApp( this.config.firebase );
        // console.info('VideoAPI firebase?', this.firebase )
    }

    /**
     * 
     * 
     */
    api(resource, method, params, callback): any {

        // console.log('VideoAPI.api request:', resource, method, params);
        // console.info('VideoAPI.api.config', this.config );
        return this.call(resource, method, params, callback);
    };

    /**
     * 
     *  target url: api/:appName/:shopName/thumbnail/delete 
     */
    public createThumbnail( dataURL: string, shopName: string, productID: string ) {
        return new Promise( ( resolve, reject ) => {

            // console.info('VideoAPI.api.config', this.config );

            // let firebase =  shopifyClient.firebase;

            // let storageRef = firebase.storage().ref().child( shopName + '/' + productID + '/poster.png' );

            resolve('OK');
                // storageRef.put(file).then( (snapshot) => {
                //     console.log('Uploaded a blob or file!',snapshot)
                //     console.log(snapshot.a.downloadURLs[0])

                // })

            // let resource = 'thumbnail';
            // let method = 'create';
            // let params = {
            //     currentTime: currentTime,
            //     videoName: videoName
            // };

            // this.call( resource, method, params, () => {
            //     resolve();
            // });

            // console.info('result: ', result);
            // const el = this.elementRef.nativeElement.cloneNode(true);
        });
    };

    /**
     * 
     */
    public deleteVideo(productID, firebaseIdToken, callback): any {
        let resource = 'video';
        let method = 'delete';
        return this.call(resource, method, {
            productID: productID,
            firebaseIdToken: firebaseIdToken,
        }, callback);
    };
}