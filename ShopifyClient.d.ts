/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/underscore/index.d.ts" />
/// <reference path="node_modules/firebase/firebase.d.ts" />
declare module "Api" {
    export interface IShopifyClientConfigFirebase extends Object {
        apiKey: string;
        authDomain: string;
        databaseURL: string;
        storageBucket: string;
        messagingSenderId?: string;
        customToken?: string;
        idToken?: string;
        user?: any;
    }
    export interface IShopifyClientConfigShopify extends Object {
        apiKey: string;
        protocol: string;
        shop: string;
        shopName: string;
    }
    export interface IShopifyClientConfig extends Object {
        appName: string;
        firebase: IShopifyClientConfigFirebase;
        shopify: IShopifyClientConfigShopify;
        debug: boolean;
    }
    export class Api {
        config: IShopifyClientConfig;
        apiBaseUrl: string;
        constructor(config: IShopifyClientConfig, apiBaseUrl: string);
        /**
         * Wrapps jQuery getJSON to use es6 Promises instead of jQuery's own implementation
         */
        getJSON(url: string, callback?: (error?: any, data?: any) => void): Promise<any>;
        /**
         * API calls are based on these bindings: https://github.com/MONEI/Shopify-api-node
         * But wrapped with or own middleware: https://github.com/JumpLinkNetwork/shopify-server
         */
        call(resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void): Promise<any>;
        protected isFunction: (func: any) => boolean;
        protected callbackDeprecated(callback: (error?: any, data?: any) => void, name: string): void;
    }
}
declare module "ShopifyClient" {
    import { Api, IShopifyClientConfig } from "Api";
    /**
     * # Shopify Apps with Angular
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
     * # TODO
     * * Database Adapter to make it possible to use another Database instead of Firebase Realtime Database
     * * Remove Callbacks, just use Promises
     * * More Dokumentation
     *
     * @export
     * @class ShopifyClient
     * @extends {Api}
     */
    export class ShopifyClient extends Api {
        firebase: firebase.app.App;
        ready: boolean;
        authBaseUrl: string;
        /**
         * Cache api results
         *
         * @type {*}
         * @memberof ShopifyClient
         */
        cache: any;
        /**
         * Creates an instance of ShopifyClient.
         * @param {IShopifyClientConfig} config The shopify client config object
         * @param {string} apiBaseUrl e.g. https://127.0.0.1/
         * @param {string} authBaseUrl e.g. https://127.0.0.1/
         *
         * @memberof ShopifyClient
         */
        constructor(config: IShopifyClientConfig, apiBaseUrl: string, authBaseUrl: string);
        /**
         * Identify if a webpage is being loaded inside an iframe or directly into the browser window
         * @see http://stackoverflow.com/a/326076
         * @returns {boolean} true if app is in iframe
         *
         * @memberof ShopifyClient
         */
        inIframe(): boolean;
        /**
         * Chjeck if SDK is ready
         *
         * @returns {boolean} true if ready
         *
         * @memberof ShopifyClient
         */
        isReady(): boolean;
        /**
         * Get the values from URL GET parameters
         * @see http://stackoverflow.com/a/1099670
         *
         * @param {string} qs query string
         * @returns {*} url parameters
         *
         * @memberof ShopifyClient
         */
        getQueryParams(qs: string): any;
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
        initEmbeddedSDK(protocol: string, shop: string, callback?: (error?: any, data?: any) => void): Promise<any>;
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
        initShopify(protocol: string, shop: string, shopName: string, callback?: (error?: any, data?: any) => void): Promise<any>;
        /**
         * Creates and initializes a Firebase app instance.
         *
         * @returns {*} The initialized firebase app
         * @see https://firebase.google.com/docs/reference/js/firebase#.initializeApp
         *
         * @memberof ShopifyClient
         */
        initFirebase(): any;
        /**
         * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
         *
         * @param {string} shop The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.comThe shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
         * @returns {string} the shopname e.g. CURRENT_LOGGED_IN_SHOP
         *
         * @memberof ShopifyClient
         */
        getShopName(shop: string): string;
        /**
         * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP
         *
         * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOPThe shop name e.g. CURRENT_LOGGED_IN_SHOP
         * @returns {string}  The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
         *
         * @memberof ShopifyClient
         */
        getShop(shopName: string): string;
        /**
         * Set the shop domain and shop name by the shop domain in this.config.shopify
         *
         * @param {string} shop The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
         * @returns {string}  The shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com
         *
         * @memberof ShopifyClient
         */
        setShop(shop: string): string;
        /**
         * Set the shop domain and shop name by the shop name in this.config.shopify
         *
         * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
         * @returns {string} The shop name e.g. CURRENT_LOGGED_IN_SHOP
         *
         * @memberof ShopifyClient
         */
        setShopName(shopName: string): string;
        /**
         * Initiates the sign-in flow using Shopify oauth sign in and redirection
         *
         * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
         * @returns {string} current url
         *
         * @memberof ShopifyClient
         */
        redirect(shopName: string): string;
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
        initApi(shopName: string, firebaseIdToken: string, callback?: (error: any, data?: any) => void): Promise<any>;
        /**
         * Get the Access tokens for shopify and firebase if these have already been set
         * Otherwise fire an error
         * @param {string} shopName The shop name e.g. CURRENT_LOGGED_IN_SHOP
         * @returns {Promise<any>} Promise with the result of initApi
         *
         * @memberof ShopifyClient
         */
        signIn(shopName: string): Promise<any>;
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
        singOut(callback: (error?: any, data?: any) => void): Promise<any>;
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
        api(resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void): Promise<any>;
        /**
         *
         *
         * @param {any} id
         * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
         * @returns {Promise<any>}
         *
         * @memberof ShopifyClient
         */
        deleteMetafield(id: any, callback?: (error?: any, data?: any) => void): Promise<any>;
        /**
         *
         *
         * @param {number[]} ids
         * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
         * @returns {Promise<any>}
         *
         * @memberof ShopifyClient
         */
        deleteAllMetafield(ids: number[], callback?: (error?: any, data?: any) => void): Promise<any>;
        /**
         *
         *
         * @param {any} productId
         * @param {(error?: any, data?: any) => void} [callback] This callback is deprecated
         * @returns {Promise<any>}
         *
         * @memberof ShopifyClient
         */
        listMetafieldByProduct(productId: any, callback?: (error?: any, data?: any) => void): Promise<any>;
        /**
         *
         *
         * @param {any} customerId
         * @param {(error?: any, data?: any) => void} callback This callback is deprecated
         * @returns {Promise<any>}
         *
         * @memberof ShopifyClient
         */
        listMetafieldByCustomer(customerId: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        listAllProduct(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        customerListAll(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        listAllCustomer(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        smartCollectionListAll(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        listAllSmartCollection(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        customCollectionListAll(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
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
        listAllCustomCollection(cache: boolean, fields: any, callback: (error?: any, data?: any) => void): Promise<any>;
    }
}
