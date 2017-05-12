/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/firebase/firebase.d.ts' />

/**
 * 
 * @export
 * @interface IShopifyClientConfigFirebase
 * @extends {Object}
 */
export interface IShopifyClientConfigFirebase extends Object {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    storageBucket: string;
    messagingSenderId?: string;

    customToken?: string;
    idToken?: string;
    user?: any; // TODO firebase user Object and move to class
}

/**
 * 
 * 
 * @export
 * @interface IShopifyClientConfigShopify
 * @extends {Object}
 */
export interface IShopifyClientConfigShopify extends Object {
    apiKey: string;
    protocol: string;
    shop: string;
    shopName: string;
}

/**
 * 
 * 
 * @export
 * @interface IShopifyClientConfig
 * @extends {Object}
 */
export interface IShopifyClientConfig extends Object {
    appName: string;
    firebase: IShopifyClientConfigFirebase;
    shopify: IShopifyClientConfigShopify;
    debug: boolean;
}

/**
 * 
 * 
 * @export
 * @class Api
 */
export class Api {

    public config: IShopifyClientConfig;

    public apiBaseUrl: string;

    constructor(config: IShopifyClientConfig, apiBaseUrl: string) {
        this.config = config;
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * Wrapps jQuery getJSON to use es6 Promises instead of jQuery's own implementation
     */
    public getJSON(url: string, callback?: (error?: any, data?: any) => void): Promise<any> {
        const self = this;
        return new Promise<any>( (resolve: (value) => void, reject: (reason) => void) => {
            self.callbackDeprecated(callback, "API.getJSON");

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
    public call(resource: string, method: string, params: any, callback?: (error?: any, data?: any) => void ): Promise<any> {
        const json = JSON.stringify(params || {});
        const url = `${this.apiBaseUrl}/api/${this.config.appName}/${this.config.shopify.shopName}/${resource}/${method}?callback=?&json=${json}`;
        this.callbackDeprecated(callback, "API.call");
        return this.getJSON(url, callback);
    }

    protected isFunction = (func) => {
        return typeof(func) === "function";
    }

    protected callbackDeprecated (callback: (error?: any, data?: any) => void,  name: string ): void {
        if (this.isFunction(callback)) {
            console.warn(new Error(`The callback of ${name} is marked as deprecated
            and will be removed in the next version, use Prmoises instead`));
        }
    }
}