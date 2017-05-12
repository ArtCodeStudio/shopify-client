/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/firebase/firebase.d.ts' />

import { Api, IShopifyClientConfig, IShopifyClientConfigFirebase, IShopifyClientConfigShopify } from "./Api";
import { shopify } from "./shopifyEASDK";

declare const ShopifyApp: shopify.EASDK;

/**
 * This librarie makes use of [Embedded App SDK](https://help.shopify.com/api/sdks/shopify-apps/embedded-app-sdk),
 * it is important that the [`ShopifyApp.init(config)`](https://help.shopify.com/api/sdks/shopify-apps/embedded-app-sdk/methods#shopifyapp-init-config)
 * function from this sdk is called before jQuery or Angular is bootstraped:
 * > ShopifyApp.init(config)
 * > Should be called immediately after the script file has loaded, as early as possible on the page (not in a jQuery.ready() or something).
 * > It will initialize data values, add postMessage listeners, check that the app is embedded in an iframe, and setup our initializers.
 *
 * This is the reason why we use our lib already insite the main.ts,
 * this makes it possible to call `ShopifyApp.init` (used in `client.initShopify`) before wie call `bootstrapModule` to bootstrap Angular:
 *
 *
 * ```typescript
 * import { shopify } from '../custom_modules/shopify-client/shopifyEASDK';
 * import { enableProdMode } from '@angular/core';
 * import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
 *
 * import { AppModule } from './app/app.module';
 * import { environment } from './environments/environment';
 *
 * import { ShopifyClient, IShopifyClientConfig } from '../custom_modules/shopify-client/shopify-client';
 *
 * declare let window: any;
 * declare let ShopifyApp: shopify.EASDK;
 *
 * let client = new ShopifyClient(window.config, window.config.microservice.api.baseUrl, window.config.microservice.auth.baseUrl);
 * let query = client.getQueryParams(document.location.search);
 *
 * let bootstrapModule = (inIframe) => {
 *   console.log('bootstrapModule');
 *   platformBrowserDynamic([
 *     { provide: 'client', useValue: client },
 *     { provide: 'sdk', useValue: ShopifyApp },
 *     { provide: 'config', useValue: window.config },
 *     { provide: 'inIframe', useValue: inIframe }
 *   ]).bootstrapModule(AppModule);
 * };
 *
 * if (environment.production) {
 *   enableProdMode();
 * }
 *
 * if (query.protocol) {
 *     client.config.shopify.protocol = query.protocol;
 * }
 *
 * if (query.shop) {
 *   client.setShop(query.shop);
 *
 *   client.initShopify( client.config.shopify.protocol, client.config.shopify.shop, client.config.shopify.shopName)
 *   .then((initApiRes) => {
 *     ShopifyApp.Bar.initialize({
 *       icon: '/assets/images/icon.svg',
 *     });
 *     bootstrapModule(true);
 *   })
 *   .catch((error) => {
 *     console.error(new Error(error));
 *   });
 *
 * } else  {
 *   console.error('No Shopify found, please open this site in Shopify, not directly!');
 *   bootstrapModule(false);
 * }
 * ```
 *
 * @export
 * @class ShopifyClient
 * @extends {Api}
 */
export class ShopifyClient extends Api {

    public firebase: firebase.app.App;

    public ready: boolean = false;
    public authBaseUrl: string;

    /**
     * Cache api results
     *
     * @type {*}
     * @memberof ShopifyClient
     */
    public cache: any = {
        listAllCustomCollection: {},
        listAllCustomer: {},
        listAllProduct: {},
        listAllSmartCollection: {},
    };

    /**
     * Creates an instance of ShopifyClient.
     * @param {IShopifyClientConfig} config The shopify client config object
     * @param {string} apiBaseUrl e.g. https://127.0.0.1/
     * @param {string} authBaseUrl e.g. https://127.0.0.1/
     *
     * @memberof ShopifyClient
     */
    constructor(config: IShopifyClientConfig, apiBaseUrl: string, authBaseUrl: string) {
        super(config, apiBaseUrl);
        this.authBaseUrl = authBaseUrl;
    }

    /**
     * Identify if a webpage is being loaded inside an iframe or directly into the browser window
     * @see http://stackoverflow.com/a/326076
     * @returns {boolean} true if app is in iframe
     *
     * @memberof ShopifyClient
     */
    public inIframe(): boolean {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    /**
     * Chjeck if SDK is ready
     *
     * @returns {boolean} true if ready
     *
     * @memberof ShopifyClient
     */
    public isReady(): boolean {
        return this.ready;
    }

    /**
     * Get the values from URL GET parameters
     * @see http://stackoverflow.com/a/1099670
     *
     * @param {string} qs query string
     * @returns {*} url parameters
     *
     * @memberof ShopifyClient
     */
    public getQueryParams(qs: string): any {
        qs = qs.split("+").join(" ");

        const params = {};
        let tokens;
        const re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    /**
     * Init the Shopify Embedded App SDK, wait until the sdk is ready or reject to Shopify
     * @see https://help.shopify.com/api/sdks/shopify-apps/embedded-app-sdk/initialization
     *
     * @param {string} protocol Should be "https://"
     * @param {string} shop The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
     * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
     * @returns {Promise<any>} Promise resolves after the Shopify Embedded App SDK is ready otherwite the app redirecrets to Shopify
     *
     * @memberof ShopifyClient
     */
    public initEmbeddedSDK(protocol: string, shop: string, callback?: (error?: any, data?: any) => void): Promise<any> {
        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {
            const initSDKConfig = {
                apiKey: this.config.shopify.apiKey,
                debug: this.config.debug,
                shopOrigin: protocol + shop,
            };

            const self = this;
            this.callbackDeprecated(callback, "ShopifyClient.initEmbeddedSDK");
            ShopifyApp.init(initSDKConfig);

            // should be ready after success auth
            ShopifyApp.ready(() => {
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
                    reject(error);
                });
            });
        });
    }

    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     *
     * @param {string} protocol Should be "https://"
     * @param {string} shop The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
     * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
     * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
     *
     * @memberof ShopifyClient
     */
    public initShopify(protocol: string, shop: string, shopName: string, callback?: (error?: any, data?: any) => void): Promise<any> {
        const self = this;
        self.callbackDeprecated(callback, "ShopifyClient.initShopify");

        // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
        if (self.inIframe()) {
            // console.log('Backend is in iframe');
            return self.initEmbeddedSDK(protocol, shop, callback);
        } else {
            return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {
                const error = "Backend is not in iframe";
                console.error(error);
                self.redirect(shopName); // get access and redirect back to the shopify app page
                reject(error);
            });
        }
    }

    /**
     * Creates and initializes a Firebase app instance.
     *
     * @returns {*} The initialized firebase app
     * @see https://firebase.google.com/docs/reference/js/firebase#.initializeApp
     *
     * @memberof ShopifyClient
     */
    public initFirebase(): any {
        return this.firebase = firebase.initializeApp(this.config.firebase);
    }

    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     *
     * @param {string} shop The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.comThe shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
     * @returns {string} the shopname e.g. CURRENT_LOGGED_IN_SHOP
     *
     * @memberof ShopifyClient
     */
    public getShopName(shop: string): string {
        return shop.substring(0, shop.indexOf("."));
    }

    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP
     *
     * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOPThe shop name e.g. CURRENT_LOGGED_IN_SHOP
     * @returns {string}  The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
     *
     * @memberof ShopifyClient
     */
    public getShop(shopName: string): string {
        return shopName + ".myshopify.com";
    }

    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopify
     *
     * @param {string} shop The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
     * @returns {string}  The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
     *
     * @memberof ShopifyClient
     */
    public setShop(shop: string): string {
        this.config.shopify.shop = shop;
        this.config.shopify.shopName = this.getShopName(this.config.shopify.shop);
        return this.config.shopify.shop;
        // console.log('setShop', shop, this.config.shopify);
    }

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopify
     *
     * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
     * @returns {string} The shop name e.g. CURRENT_LOGGED_IN_SHOP
     *
     * @memberof ShopifyClient
     */
    public setShopName(shopName: string): string {
        this.config.shopify.shop = this.getShop(shopName);
        this.config.shopify.shopName = shopName;
        return this.config.shopify.shopName;
        // console.log('setShopName', shopName, this.config.shopify);
    }

    /**
     * Initiates the sign-in flow using Shopify oauth sign in and redirection
     *
     * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
     * @returns {string} current url
     *
     * @memberof ShopifyClient
     */
    public redirect(shopName: string): string {
        // console.log("redirect", shopName);
        const accessRedirectUrl = `${this.authBaseUrl}/auth/${this.config.appName}/${shopName}/redirect`;

        // if in iframe redirect parent site
        if (this.inIframe()) {
            window.top.location.href = accessRedirectUrl;
        } else {
            window.location.href = accessRedirectUrl;
        }
        return window.location.href;
    }

    /**
     * Initiates the api and take a shop.get request to test if the api is working
     * @see https://firebase.google.com/docs/auth/admin/verify-id-tokens
     *
     * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
     * @param {string} firebaseIdToken If your Firebase client app communicates with a custom backend server,
     * you might need to identify the currently signed-in user on that server.
     * To do so securely, after a successful sign-in, send the user's ID token to your server using HTTPS.
     * Then, on the server, verify the integrity and authenticity of the ID token and retrieve the uid from it.
     * You can use the uid transmitted in this way to securely identify the currently signed-in user on your server.
     * @param {(error: any, data?: any) => void} [callback] This callback is deprecated
     * @returns {Promise<any>} Promise with the result of the init request to the server
     *
     * @memberof ShopifyClient
     */
    public initApi(shopName: string, firebaseIdToken: string, callback?: (error: any, data?: any) => void ): Promise<any> {
        const self = this;
        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${shopName}/init/${firebaseIdToken}?callback=?`;
        return this.getJSON(url, callback)
        .then((data) => {
            self.ready = true;
            return data;
        });
    }

    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise fire an error
     * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
     * @returns {Promise<any>} Promise with the result of initApi
     *
     * @memberof ShopifyClient
     */
    public signIn(shopName: string ): Promise<any> {
        const self = this;

        self.initFirebase();
        const url = `${this.authBaseUrl}/auth/${this.config.appName}/${shopName}/token?callback=?`;
        return self.getJSON(url)
        .then((data: any) => {
            // console.log('microservice-auth result', data );
            self.config.firebase.customToken = data.firebaseToken;
            // this.config.firebase.uid = data.firebaseUid; not needed
            return self.firebase.auth().signInWithCustomToken(data.firebaseToken);
        })
        .then((user) => {
            self.config.firebase.user = user;
            // console.log('firebase user', user);
            return user.getToken(/* forceRefresh */ true);
        })
        .then((firebaseIdToken) => {
            // console.log('firebaseIdToken', firebaseIdToken);
            self.config.firebase.idToken = firebaseIdToken;
            // Send token to your backend via HTTPS
            return self.initApi(shopName, firebaseIdToken);
        });
    }

    /**
     * Sing out from api and delete initialized shopify api instance on server
     *
     * @param {(error?: any, data?: any) => void} callback 
     * @returns {Promise<any>} Promise with the server response
     *
     * @memberof ShopifyClient
     * @deprecated Is this function necessary?
     * @todo Remove this method
     */
    public singOut(callback: (error?: any, data?: any) => void ): Promise<any> {
        this.callbackDeprecated(callback, "ShopifyClient.singOut");
        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/signout?callback=?`;
        return this.getJSON(url, callback);
    }

    /**
     * API calls are based on these bindings: https://github.com/MONEI/Shopify-api-node
     * @see https://github.com/MONEI/Shopify-api-node
     * @see https://help.shopify.com/api/reference
     *
     * @param {string} resource Every resource is accessed via your shopify instance: `shopify.<resouce_name>.<method_name>`
     * @param {string} method Every method is accessed via your shopify instance: `shopify.<resouce_name>.<method_name>`
     * @param {*} params params is a plain JavaScript object. See https://help.shopify.com/api/reference for parameters details.
     * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
     * @returns {Promise<any>} Promise with the shopify api response
     *
     * @memberof ShopifyClient
     */
    public api(resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void ): Promise<any> {
        this.callbackDeprecated(callback, "ShopifyClient.api");
        if (this.ready) {
            return this.call(resource, method, params, callback);
        } else {
            return new Promise( (resolve: (value) => void, reject: (reason) => void) => {
                reject(new Error("api not ready, try again later"));
            });
        }
    }

    /**
     * 
     * 
     * @param {any} id 
     * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
     * @returns {Promise<any>} 
     * 
     * @memberof ShopifyClient
     */
    public deleteMetafield(id, callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, "ShopifyClient.deleteMetafield");
        return this.call("metafield", "delete", {id}, callback);
    }

    /**
     * 
     * 
     * @param {number[]} ids 
     * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
     * @returns {Promise<any>} 
     * 
     * @memberof ShopifyClient
     */
    public deleteAllMetafield(ids: number[], callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, "ShopifyClient.deleteAllMetafield");
        // console.log("deleteAllMetafield", ids);
        return this.api("metafield", "deleteAll", {ids}, callback);
    }

    /**
     * 
     * 
     * @param {any} productId 
     * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
     * @returns {Promise<any>} 
     * 
     * @memberof ShopifyClient
     */
    public listMetafieldByProduct(productId, callback?: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, "ShopifyClient.listMetafieldByProduct");
        return this.api("metafield", "list", {
            metafield: {
                owner_id: productId,
                owner_resource: "product",
            },
        }, callback);
    }

    /**
     * 
     * 
     * @param {any} customerId 
     * @param {(error?: any, data?: any) => void} callback This callback is deprecated
     * @returns {Promise<any>} 
     * 
     * @memberof ShopifyClient
     */
    public listMetafieldByCustomer(customerId, callback: (error?: any, data?: any) => void): Promise<any> {
        this.callbackDeprecated(callback, "ShopifyClient.listMetafieldByCustomer");
        return this.api("metafield", "list", {
            metafield: {
                owner_id: customerId,
                owner_resource: "customer",
            },
        }, callback);
    }

    /**
     * 
     * 
     * @param {boolean} cache 
     * comma-separated list of fields to include in the response
     * @param {(error?: any, data?: any) => void} callback This callback is deprecated
     * @returns {Promise<any>} 
     * 
     * @memberof ShopifyClient
     */
    public listAllProduct(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        // console.log("listAllProduct", cache, fields);
        const self = this;

        self.callbackDeprecated(callback, "ShopifyClient.listAllProduct");

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllProduct && self.cache.listAllProduct[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllProduct[fields]);
                }
                resolve(self.cache.listAllProduct[fields]);
            }
            self.api("product", "listAll", {fields})
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

    /**
     * Retrieve all customers of a shop without the pagination if `list`
     *
     * @param {boolean} cache Set true if you wanna cache the api results
     * comma-separated list of fields to include in the respons
     * @param {(error?: any, data?: any) => void} callback This callback is called after the result or an error is there
     * @returns {Promise<any>} Promise with the result of the api requeset or an error
     *
     * @memberof ShopifyClient
     */
    public customerListAll(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        // console.log('listAllCustomer', cache, fields);
        const self = this;

        self.callbackDeprecated(callback, "ShopifyClient.listAllCustomer");

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllCustomer && self.cache.listAllCustomer[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllCustomer[fields]);
                }
                resolve(self.cache.listAllCustomer[fields]);
            }
            self.api("customer", "listAll", {fields})
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

    /**
     * Retrieve all customers of a shop without the pagination if `list`
     *
     * @param {boolean} cache Set true if you wanna cache the api results
     * comma-separated list of fields to include in the respons
     * @param {(error?: any, data?: any) => void} callback This callback is called after the result or an error is there
     * @returns {Promise<any>} Promise with the result of the api requeset or an error
     *
     * @memberof ShopifyClient
     * @deprecated Use customerListAll instead
     */
    public listAllCustomer(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        return this.customerListAll(cache, fields, callback);
    }

    /**
     * Get a list of all smart collections that contain a given product without the pagination if `customCollectionList`
     *
     * @param {boolean} cache Set true if you wanna cache the api results
     * comma-separated list of fields to include in the respons
     * @param {(error?: any, data?: any) => void} callback This callback is called after the result or an error is there
     * @returns {Promise<any>} Promise with the result of the api requeset or an error
     *
     * @memberof ShopifyClient
     */
    public smartCollectionListAll(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        // console.log("shopify-client: listAllSmartCollection", cache, fields);
        const self = this;

        self.callbackDeprecated(callback, "ShopifyClient.listAllSmartCollection");

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllSmartCollection && self.cache.listAllSmartCollection[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllSmartCollection[fields]);
                }
                resolve(self.cache.listAllSmartCollection[fields]);
            }
            self.api("smartCollection", "listAll", {fields})
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

    /**
     * Get a list of all smart collections that contain a given product without the pagination if `customCollectionList`
     *
     * @param {boolean} cache Set true if you wanna cache the api results
     * comma-separated list of fields to include in the respons
     * @param {(error?: any, data?: any) => void} callback This callback is called after the result or an error is there
     * @returns {Promise<any>} Promise with the result of the api requeset or an error
     *
     * @memberof ShopifyClient
     * @deprecated Use smartCollectionListAll instead
     */
    public listAllSmartCollection(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        return this.smartCollectionListAll(cache, fields, callback);
    }

    /**
     * Get a list of all custom collections that contain a given product without the pagination if `customCollectionList`
     *
     * @param {boolean} cache Set true if you wanna cache the api results
     * comma-separated list of fields to include in the respons
     * @param {(error?: any, data?: any) => void} callback This callback is called after the result or an error is there
     * @returns {Promise<any>} Promise with the result of the api requeset or an error
     *
     * @memberof ShopifyClient
     */
    public customCollectionListAll(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        // console.log("shopify-client: listAllCustomCollection", cache, fields);
        const self = this;

        self.callbackDeprecated(callback, "ShopifyClient.listAllCustomCollection");

        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {

            if (cache && self.cache && self.cache.listAllCustomCollection && self.cache.listAllCustomCollection[fields]) {
                if (self.isFunction(callback)) {
                    callback(null, self.cache.listAllCustomCollection[fields]);
                }
                resolve(self.cache.listAllCustomCollection[fields]);
            }
            self.api("customCollection", "listAll", {fields})
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

    /**
     * Get a list of all custom collections that contain a given product without the pagination if `customCollectionList`
     *
     * @param {boolean} cache Set true if you wanna cache the api results
     * comma-separated list of fields to include in the respons
     * @param {(error?: any, data?: any) => void} callback This callback is called after the result or an error is there
     * @returns {Promise<any>} Promise with the result of the api requeset or an error
     *
     * @memberof ShopifyClient
     * @deprecated Use customCollectionListAll instead
     */
    public listAllCustomCollection(cache: boolean, fields, callback: (error?: any, data?: any) => void): Promise<any> {
        return this.customCollectionListAll(cache, fields, callback);
    }
}
