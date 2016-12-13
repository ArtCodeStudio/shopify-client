/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />

/// <reference path='shopifyEASDK.d.ts' />
/// <reference path='firebase.d.ts' />
/// <reference path='shopify-client-config.d.ts' />

class ShopifyClient {

    public config: IShopifyClientConfig;

    public firebase: firebase.app.App

    constructor(config: IShopifyClientConfig) {
        this.config = config;
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
     * Get the values from URL GET parameters
     * 
     * @see http://stackoverflow.com/a/1099670
     */
    getQueryParams(qs): any {
        qs = qs.split('+').join(' ');

        let params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    initEmbeddedSDK(protocol, shop, callback): any {
        let initSDKConfig = {
            apiKey: this.config.shopifyApp.apiKey,
            shopOrigin: protocol + shop,
            debug: this.config.debug
        };

        let thisObj = this;

        // console.log('init Embedded SDK with config', initSDKConfig);

        ShopifyApp.init(initSDKConfig);

        // should be ready after success auth
        ShopifyApp.ready(function () {
            // console.log('READY YEA!');

            thisObj.signIn(thisObj.config.shopifyApp.shopName, function(error, initApiRes) {
                if(error) {
                    callback(null, error);
                    console.error(new Error(error));
                    return thisObj.getAccess(thisObj.config.shopifyApp.shopName);
                }
                callback(null, initApiRes);

            });
        });

    }

    /**
     * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
     * 
     * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
     */
    initShopify(protocol, shop, shopName, callback): any {
        // console.log('initShopify', protocol, shop, shopName);

        // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
        if(this.inIframe()) {
            // console.log('Backend is in iframe');
            this.initEmbeddedSDK(protocol, shop, callback);
        } else {
            console.error('Backend is not in iframe');
            this.getAccess(shopName); // get access and redirect back to the shopify app page
        }
    }

    initFirebase(): any {
        // console.log('initFirebase');
        this.firebase = firebase.initializeApp(this.config.firebase);
    }


    /**
     * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
     */
    getShopName (shop): any {
        return shop.substring(0, shop.indexOf('.'));
    };

    /**
     * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP 
     */
    getShop (shopName): any {
        return shopName + '.myshopify.com';
    };


    /**
     * Set the shop domain and shop name by the shop domain in this.config.shopifyApp
     */
    setShop (shop): any {
        this.config.shopifyApp.shop = shop;
        this.config.shopifyApp.shopName = this.getShopName(this.config.shopifyApp.shop);
        // console.log('setShop', shop, this.config.shopifyApp);
    };

    /**
     * Set the shop domain and shop name by the shop name in this.config.shopifyApp
     */
    setShopName (shopName): any {
        this.config.shopifyApp.shop = this.getShop(shopName);
        this.config.shopifyApp.shopName = shopName;
        // console.log('setShopName', shopName, this.config.shopifyApp);
    };

    /**
     * Initiates the sign-in flow using Shopify oauth sign in
     * 
     */
    getAccess (shopName): any {
        // console.log('getAccess', shopName);
        let accessRedirectUrl = `${this.config.shopifyApp.microserviceAuthBaseUrl}/redirect/${this.config.appName}/${shopName}`;

        // if in iframe redirect parent site
        if(this.inIframe()) {
            window.top.location.href = accessRedirectUrl;
        } else {
            window.location.href = accessRedirectUrl;
        }
    };

    initApi (shopName, firebaseIdToken, callback): any {
        // console.log('initApi', shopName, firebaseIdToken);
        let url = `${this.config.shopifyApp.microserviceApiBaseUrl}/init/${this.config.appName}/${shopName}/${firebaseIdToken}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            // console.log('greate you are signed in. shop:', data);  
            callback(null, data);
        });
    };

    /**
     * Get the Access tokens for shopify and firebase if these have already been set
     * Otherwise get access using this.getAccess with redirections
     * 
     */
    signIn (shopName, callback): any {
        // console.log('signIn');

        this.initFirebase();
        let thisObj = this;

        let url = `${this.config.shopifyApp.microserviceAuthBaseUrl}/token/${this.config.appName}/${shopName}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {

            if (data.status === 404) {
                console.error('token not found', data );
                thisObj.getAccess(shopName);
            } else if (_.isString(data.firebaseToken)) {

                // console.log('token', data.firebaseToken );

                thisObj.config.firebase.customToken = data.firebaseToken;
                // this.config.firebase.uid = data.firebaseUid; not needed 

                thisObj.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function (user) {
                    thisObj.config.firebase.user = user;
                    // console.log('firebase user', user);
                    user.getToken(/* forceRefresh */ true).then(function(firebaseIdToken) {
                        // console.log('firebaseIdToken', firebaseIdToken);
                        thisObj.config.firebase.idToken = firebaseIdToken;
                        // Send token to your backend via HTTPS
                        thisObj.initApi(shopName, firebaseIdToken, callback);

                    }).catch(function(error) {
                        // Handle error
                        callback(error);
                    });

                }).catch(function(error) {
                    // Handle Errors here.
                    callback(error);
                });
            } else {
                console.error(new Error('Das hätte nicht passieren dürfen, bitte Microservice überprüfen.'));
            }

        });
    };

    singOut (accessToken, callback): any {
        let url = `${this.config.shopifyApp.microserviceApiBaseUrl}/signout/${this.config.appName}/${this.config.shopifyApp.shopName}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            console.log('you are signed out:', data);
        });
    };

    api (resource, method, params, callback): any {
        let url = `${this.config.shopifyApp.microserviceApiBaseUrl}/api/${this.config.appName}/${this.config.shopifyApp.shopName}/${resource}/${method}?callback=?`;
        $.getJSON( url, (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            console.log('api:', data);
            callback(null, data);
        });
    };

}