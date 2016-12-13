/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/underscore/index.d.ts" />
/// <reference path="node_modules/@types/es6-promise/index.d.ts" />
/// <reference path="shopifyEASDK.d.ts" />
/// <reference path="firebase.d.ts" />
declare var firebase: Firebase;
interface IShopifyClientConfigFirebase {
    apiKey: string;
    authDomain: string;
    customToken?: string;
    databaseURL: string;
    idToken?: string;
    messagingSenderId?: string;
    storageBucket: string;
    user?: any;
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
declare class ShopifyClient {
    config: IShopifyClientConfig;
    constructor(config: IShopifyClientConfig);
    /**
     * Identify if a webpage is being loaded inside an iframe or directly into the browser window
     * @see http://stackoverflow.com/a/326076
     */
    inIframe(): boolean;
    /**
     * Get the values from URL GET parameters
     *
     * @see http://stackoverflow.com/a/1099670
     */
    getQueryParams(qs: any): any;
    initEmbeddedSDK(protocol: any, shop: any, callback: any): void;
    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     *
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     */
    initShopify: (protocol: any, shop: any, shopName: any, callback: any) => void;
    initFirebase: () => void;
    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     */
    getShopName: (shop: any) => any;
    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP
     */
    getShop: (shopName: any) => string;
    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopifyApp
     */
    setShop: (shop: any) => void;
    /**
     * Set the shop domain and shop name by the shop name in this.config.shopifyApp
     */
    setShopName: (shopName: any) => void;
    /**
     * Set the access token in config.shopifyApp
     */
    setToken: (accessToken: any) => void;
    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     *
     */
    getAccess: (shopName: any) => void;
    initApi: (shopName: any, firebaseIdToken: any, callback: any) => void;
    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.getAccess with redirections
     *
     */
    signIn: (shopName: any, callback: any) => void;
    singOut: (accessToken: any, callback: any) => void;
    api: (resource: any, method: any, params: any, callback: any) => void;
}
