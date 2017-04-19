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

    protected isFunction = (func) => {
        return typeof(func) === 'function';
    }

    protected callbackDeprecated (callback: (error?: any, data?: any) => void,  name: string ): void {
        if (this.isFunction(callback)) {
            console.warn(new Error(`The callback of ${name} is marked as deprecated
            and will be removed in the next version, use Prmoises instead`));
        }
    }

    /**
     * Wrapps jQuery getJSON to use es6 Promises instead of jQuery's own implementation
     */
    getJSON (url: string, callback?: (error?: any, data?: any) => void): Promise<any> {
        const self = this;
        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {
            self.callbackDeprecated(callback, 'API.getJSON');

            $.getJSON(url)
            .done((data: any, textStatus: string, jqXHR: JQueryXHR) => {
                // console.log('Api.call result:', data);
                if (self.isFunction(callback)) {
                    callback(null, data);
                }
                resolve(data);
            })
            .fail((jqXHR: JQueryXHR, textStatus: string, errorThrown: any) => {
                console.error(textStatus);
                if (self.isFunction(callback)) {
                    callback(textStatus);
                }
                reject(textStatus);
            });
        });
    }

    /**
     * API calls are based on these bindings: https://github.com/MONEI/Shopify-api-node
     * But wrapped with or own middleware: https://github.com/JumpLinkNetwork/shopify-server
     */
    call (resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void ): Promise<any> {
        const json = JSON.stringify(params || {});
        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/${resource}/${method}?callback=?&json=${json}`;
        this.callbackDeprecated(callback, 'API.call');
        return this.getJSON(url, callback);
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

        const params = {};
        let tokens;
        const re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    initEmbeddedSDK(protocol: string, shop: string, callback?: (error?: any, data?: any) => void): Promise<any> {

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            const initSDKConfig = {
                apiKey: this.config.shopify.apiKey,
                shopOrigin: protocol + shop,
                debug: this.config.debug
            };

            const self = this;

            // console.log('init Embedded SDK with config', initSDKConfig);

            this.callbackDeprecated(callback, 'ShopifyClient.initEmbeddedSDK');

            ShopifyApp.init(initSDKConfig);

            // should be ready after success auth
            ShopifyApp.ready(() => {
                // console.log('READY YEA!');

                self.signIn(self.config.shopify.shopName)
                .then((initApiRes) => {
                    if (this.isFunction(callback)) {
                        callback(null, initApiRes);
                    }
                    resolve(initApiRes);
                })
                .catch((error) => {
                    console.error(error);
                    if (this.isFunction(callback)) {
                        callback(error);
                    }
                    self.redirect(self.config.shopify.shopName);
                    return reject(error);
                })
            });
        });

    }

    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     * 
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     */
    initShopify(protocol: string, shop: string, shopName: string, callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.initShopify');

        // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
        if (this.inIframe()) {
            // console.log('Backend is in iframe');
            return this.initEmbeddedSDK(protocol, shop, callback);
        } else {
            return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {
                const error = 'Backend is not in iframe';
                console.error(error);
                this.redirect(shopName); // get access and redirect back to the shopify app page
                reject(error);
            });
        }

    }

    initFirebase(): any {
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
    setShop (shop: string): string {
        this.config.shopify.shop = shop;
        this.config.shopify.shopName = this.getShopName(this.config.shopify.shop);
        return this.config.shopify.shop;
        // console.log('setShop', shop, this.config.shopify);
    };

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopify
     */
    setShopName (shopName: string): string {
        this.config.shopify.shop = this.getShop(shopName);
        this.config.shopify.shopName = shopName;
        return this.config.shopify.shopName;
        // console.log('setShopName', shopName, this.config.shopify);
    };

    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     *
     */
    redirect (shopName: string): string {
        console.log('redirect', shopName);
        const accessRedirectUrl = `${this.authBaseUrl}/auth/${this.config.appName}/${shopName}/redirect`;

        // if in iframe redirect parent site
        if (this.inIframe()) {
            window.top.location.href = accessRedirectUrl;
        } else {
            window.location.href = accessRedirectUrl;
        }
        return window.location.href;
    };

    initApi (shopName: string, firebaseIdToken: string, callback?: (error: any, data?: any) => void ): Promise<any> {
        const self = this;
        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${shopName}/init/${firebaseIdToken}?callback=?`;
        return this.getJSON(url, callback)
        .then((data) => {
            self.ready = true;
            return data;
        });
    };

    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.redirect with redirections
     */
    signIn (shopName: string, callback?: (error?: any, data?: any) => void ): Promise<any> {
        const self = this;

        self.callbackDeprecated(callback, 'ShopifyClient.signIn');
        self.initFirebase();
        const url = `${this.authBaseUrl}/auth/${this.config.appName}/${shopName}/token?callback=?`;
        return self.getJSON(url, callback)
        .then((data: any) => {
            // console.log('microservice-auth result', data );
            self.config.firebase.customToken = data.firebaseToken;
            // this.config.firebase.uid = data.firebaseUid; not needed 
            return self.firebase.auth().signInWithCustomToken(data.firebaseToken);
        })
        .then((user) => {
            self.config.firebase.user = user;
            // console.log('firebase user', user);
            return user.getToken(/* forceRefresh */ true)
        })
        .then((firebaseIdToken) => {
            // console.log('firebaseIdToken', firebaseIdToken);
            self.config.firebase.idToken = firebaseIdToken;
            // Send token to your backend via HTTPS
            return self.initApi(shopName, firebaseIdToken);
        }).catch((error) => {
            // Handle Errors here.
            if (self.isFunction(callback)) {
                callback(error);
            }
            self.redirect(shopName);
            return error;
        });
    };

    singOut (accessToken: string, callback: (error?: any, data?: any) => void ): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.singOut');
        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/signout?callback=?`;
        return this.getJSON(url, callback);
    };

    /**
     * API calls are based on these bindings: https://github.com/MONEI/Shopify-api-node
     */
    api (resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void ): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.api');

        if (this.ready) {
            return this.call(resource, method, params, callback);
        } else {
            return new Promise( (resolve: (value) => void, reject: (reason) => void) => {
                reject(new Error('api not ready, try again later'));
            });
        }
    };

    deleteMetafield(id, callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.deleteMetafield');
        return this.call('metafield', 'delete', {id: id}, callback);
    }

    deleteAllMetafield(ids: Array<Number>, callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.deleteAllMetafield');
        console.log('deleteAllMetafield', ids);
        return this.api('metafield', 'deleteAll', {ids: ids}, callback);
    }

    listMetafieldByProduct(productId, callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.listMetafieldByProduct');
        return this.api('metafield', 'list', {
            metafield: {
                owner_resource: 'product',
                owner_id: productId
            }
        }, callback);
    }

    listMetafieldByCustomer(customerId, callback: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, 'ShopifyClient.listMetafieldByCustomer');
        return this.api('metafield', 'list', {
            metafield: {
                owner_resource: 'customer',
                owner_id: customerId
            }
        }, callback);
    }

    listAllProduct(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        console.log('listAllProduct', cache, fields);
        const self = this;

        self.callbackDeprecated(callback, 'ShopifyClient.listAllProduct');

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllProduct && self.cache.listAllProduct[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllProduct[fields]);
                }
                resolve(self.cache.listAllProduct[fields]);
            }
            self.api('product', 'listAll', {fields: fields})
            .then((data) => {
                if (cache) {
                    self.cache.listAllProduct[fields] = data;
                }
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllProduct[fields]);
                }
                resolve(self.cache.listAllProduct[fields]);
            })
            .catch((error) => {
                if (self.isFunction(callback)) {
                    callback(error);
                }
                return reject(error);
            });

        });
    }

    listAllCustomer(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        console.log('listAllCustomer', cache, fields);
        const self = this;

        self.callbackDeprecated(callback, 'ShopifyClient.listAllCustomer');

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllCustomer && self.cache.listAllCustomer[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllCustomer[fields]);
                }
                resolve(self.cache.listAllCustomer[fields]);
            }
            self.api('customer', 'listAll', {fields: fields})
            .then((data) => {
                if (cache) {
                    self.cache.listAllCustomer[fields] = data;
                }
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllCustomer[fields]);
                }
                resolve(self.cache.listAllCustomer[fields]);
            })
            .catch((error) => {
                if (self.isFunction(callback)) {
                    callback(error);
                }
                return reject(error);
            });

        });
    }

    listAllSmartCollection(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        console.log('shopify-client: listAllSmartCollection', cache, fields);
        const self = this;

        self.callbackDeprecated(callback, 'ShopifyClient.listAllSmartCollection');

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllSmartCollection && self.cache.listAllSmartCollection[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllSmartCollection[fields]);
                }
                resolve(self.cache.listAllSmartCollection[fields]);
            }
            self.api('smartCollection', 'listAll', {fields: fields})
            .then((data) => {
                if (cache) {
                    self.cache.listAllSmartCollection[fields] = data;
                }
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllSmartCollection[fields]);
                }
                resolve(self.cache.listAllSmartCollection[fields]);
            })
            .catch((error) => {
                if (self.isFunction(callback)) {
                    callback(error);
                }
                return reject(error);
            });

        });
    }

    listAllCustomCollection(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        console.log('shopify-client: listAllCustomCollection', cache, fields);
        const self = this;

        self.callbackDeprecated(callback, 'ShopifyClient.listAllCustomCollection');

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllCustomCollection && self.cache.listAllCustomCollection[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllCustomCollection[fields]);
                }
                resolve(self.cache.listAllCustomCollection[fields]);
            }
            self.api('customCollection', 'listAll', {fields: fields})
            .then((data) => {
                if (cache) {
                    self.cache.listAllCustomCollection[fields] = data;
                }
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllCustomCollection[fields]);
                }
                resolve(self.cache.listAllCustomCollection[fields]);
            })
            .catch((error) => {
                if (self.isFunction(callback)) {
                    callback(error);
                }
                return reject(error);
            });

        });
    }

}