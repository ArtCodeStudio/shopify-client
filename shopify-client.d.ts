/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="shopifyEASDK.d.ts" />
/// <reference path="shopify-client-config.d.ts" />
declare class ShopifyClient {
    config: IShopifyClientConfig;
    firebase: any;
    ready: boolean;
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
    getQueryParams(qs: string): Object;
    initEmbeddedSDK(protocol: string, shop: string, callback: (error?: any, data?: any) => void): any;
    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     *
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     */
    initShopify(protocol: string, shop: string, shopName: string, callback: (error?: any, data?: any) => void): void;
    initFirebase(): any;
    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     */
    getShopName(shop: string): string;
    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP
     */
    getShop(shopName: string): string;
    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopifyApp
     */
    setShop(shop: string): void;
    /**
     * Set the shop domain and shop name by the shop name in this.config.shopifyApp
     */
    setShopName(shopName: string): void;
    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     *
     */
    getAccess(shopName: string): void;
    initApi(shopName: string, firebaseIdToken: string, cb: (error: any, data?: any) => void): void;
    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.getAccess with redirections
     *
     */
    signIn(shopName: string, callback: (error?: any, data?: any) => void): void;
    singOut(accessToken: string, callback: (error?: any, data?: any) => void): any;
    api(resource: string, method: string, params: Object, callback: (error?: any, data?: any) => void): any;
}
