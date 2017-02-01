/// <reference path="node_modules/@types/jquery/index.d.ts" />
/// <reference path="node_modules/@types/underscore/index.d.ts" />
/// <reference path="node_modules/@types/es6-promise/index.d.ts" />
/// <reference path="firebase.d.ts" />
/// <reference types="es6-promise" />
declare module "shopifyEASDK" {
    /**
     * type definitions for Shopify's Embedded App SDK
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk
     */
    export namespace shopify {
        interface IConfig {
            /**
             * ff9b1d04414785029e066f8fd0465d00 or similar.
             * The API key provided to you for your application in the Shopify Partners area.*
             */
            apiKey: string;
            /**
             * The origin of the Shopify shop.
             * This will come out of the session values returned from the Shopify API
             * and should be set dynamically for each different merchant/shop.
             * It'll be something like "https://example.myshopify.com" and should always include the protocol.
             */
            shopOrigin: string;
            /**
             * 	Defaults to true. Can be used to disable redirection into the admin for debugging or testing purposes.
             */
            forceRedirect?: boolean;
            /**
             * 	Defaults to false. Will activate some console.log logging output.
             */
            debug?: boolean;
        }
        /**
         * Button objects are used to define buttons on the top bar and in modal windows.
         * A button object has a required label field for the button text.
         * It has optional fields for message which is the postMessage the admin will send when the button is clicked.
         * It also accepts an callback function that is called on click.
         * Alternately it accepts a href attribute which will make the button open the provided link in a new window.
         * The use case for the link is something like "Open preview in a new window".
         */
        interface IButtonConfig {
            /**
             * The text displayed in the button.
             */
            label: string;
            /**
             * The value of the post message that Shopify will send down to the application that can then be listened for.
             * Attributes such as callback and href create these messages manually and do not require this to be set.
             */
            message?: string;
            /**
             * When the button is clicked, this function will be executed in the app. Params are (message, data).
             */
            callback?: (message: string, data: any) => void;
            /**
             * The URL to be opened.
             * It should be absolute for app links or external links.
             * For links within Shopify it should be of the format /orders/123.
             * The specific location where this link will be opened depends on the target attribute.
             */
            href?: string;
            /**
             * The location where the value of the href will be opened. Default is app.
             * The acceptable values are:
             *  new - Open a new window/tab.
             *  parent - Replace the current frame/window.
             *  shopify - A redirect to within the Shopify admin. A relative path without the admin prefix, like /products.
             *  app - Redirects the app's iframe to this URL. Essentially clicking a regular navigation link in the app.
             */
            target?: string;
            /**
             * A boolean value stating if the loading spinner should activate when this button is pressed.
             * Shopify attempts to make a rational guess as to if this should be true or false depending on the action (ie: target:
             * 'new' defaults to false, but target: 'app' defaults to true).
             * It is always safe and prudent to override this value to be exactly what you require for your specific application.
             */
            loading?: boolean;
            /**
             * Optional color styling for the button. It will always be a sane default,
             * but can accept danger and disabled. If this is not set,
             * primary buttons appear blue and secondary and tertiary buttons are white.
             */
            style?: string;
            /**
             * Sets the button to become a dropdown button.
             * Should be used alongside the links attribute.
             * Current accepted value is dropdown.
             * Only valid for secondary top bar buttons.
             */
            type?: string;
            /**
             * A list of buttons. Accepts the same attributes as a regular button, like label, target and callback.
             * Only valid for secondary top bar buttons.
             */
            links?: Array<IButtonConfig>;
        }
        interface IButtonsConfig {
            primary?: IButtonConfig;
            secondary?: IButtonConfig;
        }
        /**
         * The configuration for pagination is a simplified version of button objects.
         * When the pagination: key contains anything that is not falsy, the buttons will appear but will be inactive.
         * The pagination: key expects an object containing two objects as previous: and next:, each describing a button.
         * The button definition objects look like this:
         */
        interface IPaginationConfig {
            /**
             * When the button is clicked, this function will be executed in the app.
             */
            callback: () => void;
            /**
             * The URL to be opened in the app.
             */
            href: string;
            /**
             * A boolean value stating if the loading spinner should activate when this button is pressed. This defaults to `true`.
             */
            loading: boolean;
        }
        interface IBarConfig {
            /**
             * An object describing the buttons displayed in the top bar.
             * The object contains two keys, primary and secondary, and each of those keys contain an array of button objects.
             * Primary buttons default to blue, and have a maximum of one button.
             * Secondary buttons have a maximum of four buttons.
             */
            buttons?: IButtonsConfig;
            /**
             * The title string displayed in the header behind the application's name.
             */
            title?: string;
            /**
             * A URL to an image file used as the icon in the top bar. If omitted, a default app icon will be used.
             */
            icon?: string;
            /**
             * An object configuring and toggling the pagination arrow button group.
             */
            pagination?: IPaginationConfig;
            /**
             * A button object configuring and toggling the breadcrumb in the top bar.
             */
            breadcrumb?: IButtonConfig;
        }
        interface Bar {
            /**
             * Accepts an object that defines how the top bar and buttons will look and behave.
             * This should almost always be called in the ready() method.
             * Default behavior if initialize is never called will result in some pretty safe defaults,
             * except that the loading spinner will never stop spinning.
             */
            initialize(config: IBarConfig): void;
            /**
             * Stops the loading spinner. Should probably be called on every page in ShopifyApp.ready().
             */
            loadingOff(): void;
            /**
             * Manually set the title string in the top bar. See ShopifyApp.Bar.initialize().
             */
            setTitle(title: string): void;
            /**
             * Manually set the icon of the top bar from a URL. See ShopifyApp.Bar.initialize().
             */
            setIcon(icon: string): void;
            /**
             * Manually set the icon of the top bar from a URL. See ShopifyApp.Bar.initialize().
             */
            setPagination(config: IPaginationConfig): void;
            /**
             * Manually set the breadcrumb in the top bar for an extra level of navigation.
             * Pass a button object, or pass undefined to remove it entirely. See ShopifyApp.Bar.initialize().
             */
            setBreadcrumb(config: IButtonConfig): void;
        }
        class EASDK {
            Bar: Bar;
            constructor();
            /**
             * Should be called immediately after the script file has loaded,
             * as early as possible on the page (not in a jQuery.ready() or something).
             * It will initialize data values, add postMessage listeners, check that the app is embedded in an iframe, and setup our initializers.
             */
            init(config: IConfig): void;
            /**
             * Works similarly to jQuery's ready() function.
             * It can be called many times on a page, it accepts functions,
             * and when the Admin and the app are loaded it will call the functions in order.
             *
             * ```
             * ShopifyApp.ready(function(){
             *   alert("Ready");
             * });
             * ```
             */
            ready(cb: () => void): void;
            /**
             * Used to rewrite the current URL. This is called automatically and probably doesn't need to be explicitly called at all.
             */
            pushState(path: string): void;
            /**
             * Displays a message in the Shopify admin chrome styled as a notice. Use only for successful or neutral messages.
             *
             * `ShopifyApp.flashNotice("Unicorn was created successfully.");`
             */
            flashNotice(message: string): void;
            /**
             * Displays a message in the Shopify admin chrome styled as an error. Use only for errors or failures.
             *
             * `ShopifyApp.flashError("Unicorn could not be created.");`
             */
            flashError(message: string): void;
            /**
             * Dispatches away from the app and into another section in the Shopify admin.
             * The path should be prefixed with a slash, but should not include the /admin part.
             * Example: /customers/120999015 or  /settings/domains.
             *
             * `ShopifyApp.redirect("/orders");`
             */
            redirect(path: string): void;
        }
    }
}
declare module "shopify-client" {
    export class ShopifyClientConfigFirebase extends Object {
        apiKey: string;
        authDomain: string;
        databaseURL: string;
        storageBucket: string;
        messagingSenderId?: string;
        customToken?: string;
        idToken?: string;
        user?: any;
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
        constructor(config: ShopifyClientConfig, apiBaseUrl: string);
        /**
         * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
         * But wrapped with or own microserive: https://git.mediamor.de/jumplink.eu/microservice-shopify
         */
        call(resource: string, method: string, params: any, callback: (error?: any, data?: any) => void): void;
    }
    export class ShopifyClient extends Api {
        firebase: firebase.app.App;
        ready: boolean;
        authBaseUrl: string;
        /**
         * Cache api results
        */
        cache: any;
        constructor(config: ShopifyClientConfig, apiBaseUrl: string, authBaseUrl: string);
        /**
         * Identify if a webpage is being loaded inside an iframe or directly into the browser window
         * @see http://stackoverflow.com/a/326076
         */
        inIframe(): boolean;
        /**
         * Chjeck if SDK is ready
         */
        isReady(): boolean;
        /**
         * Get the values from URL GET parameters
         *
         * @see http://stackoverflow.com/a/1099670
         */
        getQueryParams(qs: string): any;
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
         * Set the shop domain and shop name by the shop domain in this.config.shopify
         */
        setShop(shop: string): void;
        /**
         * Set the shop domain and shop name by the shop name in this.config.shopify
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
        singOut(accessToken: string, callback: (error?: any, data?: any) => void): void;
        /**
         * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
         */
        api(resource: string, method: string, params: any, callback: (error?: any, data?: any) => void): void;
        deleteMetafield(id: any, callback: (error?: any, data?: any) => void): void;
        deleteAllMetafield(ids: Array<Number>, callback: (error?: any, data?: any) => void): void;
        listMetafieldByProduct(productId: any, callback: (error?: any, data?: any) => void): void;
        listAllProduct(cache: any, fields: any, callback: (error?: any, data?: any) => void): void;
    }
    export class VideoAPI extends Api {
        constructor(config: ShopifyClientConfig, apiBaseUrl: string, callback: any);
        initFirebase(): void;
        /**
         *
         *
         */
        api(resource: any, method: any, params: any, callback: any): any;
        /**
         *
         *  target url: api/:appName/:shopName/thumbnail/delete
         */
        createThumbnail(dataURL: string, shopName: string, productID: string): Promise<{}>;
        /**
         * server route : /api/:appName/:shopName/video/convert
         */
        convertVideo(downloadURL: any, productID: any): Promise<any>;
        /**
         *
         */
        deleteVideo(productID: any, firebaseIdToken: any, callback: any): any;
    }
}
