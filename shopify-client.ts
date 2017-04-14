/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='firebase.d.ts' />

import { shopify } from './shopifyEASDK';

declare const ShopifyApp: shopify.EASDK;

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
     * API calls are based on these bindings: https://github.com/MONEI/Shopify-api-node
     * But wrapped with or own middleware: https://github.com/JumpLinkNetwork/shopify-server
     */
    call (resource: string, method: string, params: any, callback: (error?: any, data?: any) => void ): Promise<any> {

        if (typeof(callback) === 'function') {
            console.warn(new Error(`The callback of this method is marked as deprecated
            and will be removed in the next version, use Prmoises instead`));
        }

        const json = JSON.stringify(params || {});

        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/${resource}/${method}?callback=?&json=${json}`;

        // console.log('Api.call request:', url);
        return new Promise( (resolve: (value) => void, reject: (reason) => void) => {
            $.getJSON( url)
            .done(function(data: JQueryXHR, textStatus: string, errorThrown: string) {
                // console.log('Api.call result:', data);
                if (typeof(callback) === 'function') {
                    callback(null, data);
                }
                resolve(data);
            })
            .fail((data: JQueryXHR, textStatus: string, errorThrown: string) => {
                console.error(data, textStatus, errorThrown);
                if (typeof(callback) === 'function') {
                    callback(textStatus);
                }
                reject(textStatus);
            });
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
        listAllProduct: {},
        listAllCustomer: {},
        listAllSmartCollection: {},
        listAllCustomCollection: {},
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
    initShopify(protocol: string, shop: string, shopName: string, callback?: (error?: any, data?: any) => void): void {
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
        let url = `${this.apiBaseUrl}/api/${this.config.appName}/${shopName}/init/${firebaseIdToken}?callback=?`;
        console.debug('initApi', url);
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
        $.getJSON(url).done((data: any, textStatus: string, jqXHR: JQueryXHR) => {

            if (jqXHR.status == 404) {
                console.error('Token not found');
                self.getAccess(shopName);
            }
            

            if (typeof(data.firebaseToken) === 'string') {

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

        }).fail((event, jqXHR: JQueryXHR, exception) => {
            if (jqXHR.status == 404) {
                console.error('Token not found');
            }
            self.getAccess(shopName);
        });
    };

    singOut (accessToken: string, callback: (error?: any, data?: any) => void ): void {
        let url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/signout?callback=?`;
        let jqxhr = $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('you are signed out:', data);
            return callback(null, data);
        });

        jqxhr.fail((xhr: JQueryXHR, textStatus: string, errorThrown: string) => {
            return callback(textStatus);
        });
    };

    /**
     * API calls are based on these bindings: https://github.com/MONEI/Shopify-api-node
     */
    api (resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void ): Promise<any> {
        const self = this;

        if (typeof(callback) === 'function') {
            console.warn(new Error(`The callback of this method is marked as deprecated
            and will be removed in the next version, use Prmoises instead`));
        }

        if (self.ready) {
            return self.call(resource, method, params, callback);
        } else {
            return new Promise( (resolve: (value) => void, reject: (reason) => void) => {
                reject(new Error('api not ready, try again..'));
            });
        }
    };

    deleteMetafield(id, callback: (error?: any, data?: any) => void) {
        const self = this;
        self.api('metafield', 'delete', id, ( err , result) => {
            if (err) {
                return callback(err);
            }
            return callback(null, result);
        });
    }

    deleteAllMetafield(ids: Array<Number>, callback: (error?: any, data?: any) => void) {
        const self = this;

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

    listMetafieldByCustomer(customerId, callback: (error?: any, data?: any) => void) {
        let self = this;
        self.api('metafield', 'list', {
            metafield: {
                owner_resource: 'customer',
                owner_id: customerId
            }
        }, ( err , customerMetafields) => {
            if (err) {
                return callback(err);
            }
            return callback(null, customerMetafields);
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

    listAllCustomer(cache, fields, callback: (error?: any, data?: any) => void) {
        console.log('listAllCustomer', cache, fields);
        let self = this;
        if (cache && self.cache && self.cache.listAllCustomer && self.cache.listAllCustomer[fields]) {
            return callback(null, self.cache.listAllCustomer[fields]);
        }
        self.api('customer', 'listAll', {fields: fields}, (error, data) => {
            console.log('customer listAll');
            if (!error && cache) {
                self.cache.listAllCustomer[fields] = data;
            }
            callback(error, data);
        });
    }

    listAllSmartCollection(cache, fields, callback: (error?: any, data?: any) => void) {
        console.log('shopify-client: listAllSmartCollection', cache, fields);
        let self = this;
        if (cache && self.cache && self.cache.listAllSmartCollection && self.cache.listAllSmartCollection[fields]) {
            return callback(null, self.cache.listAllSmartCollection[fields]);
        }
        self.api('smartCollection', 'listAll', {fields: fields}, (error, data) => {
            console.log('api callback: smartCollection listAll');
            if (!error && cache) {
                self.cache.listAllSmartCollection[fields] = data;
            }
            callback(error, data);
        });
    }

    listAllCustomCollection(cache, fields, callback: (error?: any, data?: any) => void) {
        console.log('shopify-client: listAllCustomCollection', cache, fields);
        let self = this;
        if (cache && self.cache && self.cache.listAllCustomCollection && self.cache.listAllCustomCollection[fields]) {
            return callback(null, self.cache.listAllCustomCollection[fields]);
        }
        self.api('customCollection', 'listAll', {fields: fields}, (error, data) => {
            console.log('api callback: customCollection listAll');
            if (!error && cache) {
                self.cache.listAllCustomCollection[fields] = data;
            }
            callback(error, data);
        });
    }

}