/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/underscore/index.d.ts" />
/// <reference path="node_modules/@types/es6-promise/index.d.ts" />
/// <reference path="shopifyEASDK.d.ts" />
/// <reference path="firebase.d.ts" />
/// <reference path="shopify-client-config.d.ts" />
declare class VideoAPI {
    config: IShopifyClientConfig;
    constructor(config: IShopifyClientConfig, callback: any);
    api(resource: any, method: any, params: any, callback: any): any;
}
