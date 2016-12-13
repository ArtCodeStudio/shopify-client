/**
 * type definitions for Shopify's Embedded App SDK
 * @see https://help.shopify.com/api/sdks/embedded-app-sdk
 */

interface EASDKSettings {
    apiKey: string;
    shopOrigin: string;
    forceRedirect?: boolean;
    debug?: boolean;
}

interface EASDKReadyCallback {
    (): void;
}

interface EASDKShopifyApp {
    init(settings: JQueryAjaxSettings): any;
    ready(cb: EASDKReadyCallback): any;
}

declare var ShopifyApp: EASDKShopifyApp;