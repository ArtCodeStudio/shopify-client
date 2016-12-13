/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />

declare interface IShopifyClientConfigFirebase extends Object {
    customToken?: string;
    idToken?: string;
    messagingSenderId?: string;
    user?: any; // TODO firebase user Object and move to class
}

declare interface IShopifyClientConfigShopify extends Object {
    apiKey: string;
    microserviceApiBaseUrl: string;
    microserviceAuthBaseUrl: string;
    microserviceVideoBaseUrl: string;
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