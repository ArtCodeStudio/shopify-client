var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
System.register("shopifyEASDK", [], function (exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
        }
    };
});
/// <reference path='node_modules/@types/jquery/index.d.ts' />
/// <reference path='node_modules/@types/underscore/index.d.ts' />
/// <reference path='node_modules/@types/es6-promise/index.d.ts' />
System.register("shopify-client", [], function (exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    var ShopifyClientConfigFirebase, ShopifyClientConfigShopify, ShopifyClientConfig, Api, ShopifyClient, VideoAPI;
    return {
        setters: [],
        execute: function () {/// <reference path='node_modules/@types/jquery/index.d.ts' />
            /// <reference path='node_modules/@types/underscore/index.d.ts' />
            /// <reference path='node_modules/@types/es6-promise/index.d.ts' />
            ShopifyClientConfigFirebase = (function (_super) {
                __extends(ShopifyClientConfigFirebase, _super);
                function ShopifyClientConfigFirebase() {
                    return _super.apply(this, arguments) || this;
                }
                return ShopifyClientConfigFirebase;
            }(Object));
            exports_2("ShopifyClientConfigFirebase", ShopifyClientConfigFirebase);
            ShopifyClientConfigShopify = (function (_super) {
                __extends(ShopifyClientConfigShopify, _super);
                function ShopifyClientConfigShopify() {
                    return _super.apply(this, arguments) || this;
                }
                return ShopifyClientConfigShopify;
            }(Object));
            exports_2("ShopifyClientConfigShopify", ShopifyClientConfigShopify);
            ShopifyClientConfig = (function (_super) {
                __extends(ShopifyClientConfig, _super);
                function ShopifyClientConfig() {
                    return _super.apply(this, arguments) || this;
                }
                return ShopifyClientConfig;
            }(Object));
            exports_2("ShopifyClientConfig", ShopifyClientConfig);
            Api = (function () {
                function Api(config, apiBaseUrl) {
                    this.config = config;
                    this.apiBaseUrl = apiBaseUrl;
                }
                /**
                 * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
                 * But wrapped with or own microserive: https://git.mediamor.de/jumplink.eu/microservice-shopify
                 */
                Api.prototype.call = function (resource, method, params, callback) {
                    var query = $.param(params);
                    if (query.length > 0) {
                        query = '&' + query;
                    }
                    var url = this.apiBaseUrl + "/api/" + this.config.appName + "/" + this.config.shopify.shopName + "/" + resource + "/" + method + "?callback=?" + query;
                    // console.log('Api.call request:', url);
                    var jqxhr = $.getJSON(url)
                        .done(function (data, textStatus, errorThrown) {
                        // console.log('Api.call result:', data);
                        return callback(null, data);
                    })
                        .fail(function (data, textStatus, errorThrown) {
                        console.error(data, textStatus, errorThrown);
                        return callback(textStatus);
                    });
                };
                ;
                return Api;
            }());
            exports_2("Api", Api);
            ShopifyClient = (function (_super) {
                __extends(ShopifyClient, _super);
                function ShopifyClient(config, apiBaseUrl, authBaseUrl) {
                    var _this = _super.call(this, config, apiBaseUrl) || this;
                    _this.ready = false;
                    /**
                     * Cache api results
                    */
                    _this.cache = {
                        listAllProduct: {}
                    };
                    _this.authBaseUrl = authBaseUrl;
                    return _this;
                }
                /**
                 * Identify if a webpage is being loaded inside an iframe or directly into the browser window
                 * @see http://stackoverflow.com/a/326076
                 */
                ShopifyClient.prototype.inIframe = function () {
                    try {
                        return window.self !== window.top;
                    }
                    catch (e) {
                        return true;
                    }
                };
                /**
                 * Chjeck if SDK is ready
                 */
                ShopifyClient.prototype.isReady = function () {
                    return this.ready;
                };
                /**
                 * Get the values from URL GET parameters
                 *
                 * @see http://stackoverflow.com/a/1099670
                 */
                ShopifyClient.prototype.getQueryParams = function (qs) {
                    qs = qs.split('+').join(' ');
                    var params = {}, tokens, re = /[?&]?([^=]+)=([^&]*)/g;
                    while (tokens = re.exec(qs)) {
                        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
                    }
                    return params;
                };
                ShopifyClient.prototype.initEmbeddedSDK = function (protocol, shop, callback) {
                    var initSDKConfig = {
                        apiKey: this.config.shopify.apiKey,
                        shopOrigin: protocol + shop,
                        debug: this.config.debug
                    };
                    var self = this;
                    // console.log('init Embedded SDK with config', initSDKConfig);
                    ShopifyApp.init(initSDKConfig);
                    // should be ready after success auth
                    ShopifyApp.ready(function () {
                        // console.log('READY YEA!');
                        self.signIn(self.config.shopify.shopName, function (error, initApiRes) {
                            if (error) {
                                callback(error, initApiRes);
                                console.error(new Error(error));
                                return self.getAccess(self.config.shopify.shopName);
                            }
                            callback(null, initApiRes);
                        });
                    });
                };
                /**
                 * Init Shopify Embedded App SDK or redirect to the Shopify App Admin Page
                 *
                 * @see https://help.shopify.com/api/sdks/embedded-app-sdk/initialization
                 */
                ShopifyClient.prototype.initShopify = function (protocol, shop, shopName, callback) {
                    // console.log('initShopify', protocol, shop, shopName);
                    // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
                    if (this.inIframe()) {
                        // console.log('Backend is in iframe');
                        this.initEmbeddedSDK(protocol, shop, callback);
                    }
                    else {
                        console.error('Backend is not in iframe');
                        this.getAccess(shopName); // get access and redirect back to the shopify app page
                    }
                };
                ShopifyClient.prototype.initFirebase = function () {
                    // console.log('initFirebase');
                    return this.firebase = firebase.initializeApp(this.config.firebase);
                };
                /**
                 * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
                 */
                ShopifyClient.prototype.getShopName = function (shop) {
                    return shop.substring(0, shop.indexOf('.'));
                };
                ;
                /**
                 * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP
                 */
                ShopifyClient.prototype.getShop = function (shopName) {
                    return shopName + '.myshopify.com';
                };
                ;
                /**
                 * Set the shop domain and shop name by the shop domain in this.config.shopify
                 */
                ShopifyClient.prototype.setShop = function (shop) {
                    this.config.shopify.shop = shop;
                    this.config.shopify.shopName = this.getShopName(this.config.shopify.shop);
                    // console.log('setShop', shop, this.config.shopify);
                };
                ;
                /**
                 * Set the shop domain and shop name by the shop name in this.config.shopify
                 */
                ShopifyClient.prototype.setShopName = function (shopName) {
                    this.config.shopify.shop = this.getShop(shopName);
                    this.config.shopify.shopName = shopName;
                    // console.log('setShopName', shopName, this.config.shopify);
                };
                ;
                /**
                 * Initiates the sign-in flow using Shopify oauth sign in
                 *
                 */
                ShopifyClient.prototype.getAccess = function (shopName) {
                    console.log('getAccess', shopName);
                    var accessRedirectUrl = this.authBaseUrl + "/redirect/" + this.config.appName + "/" + shopName;
                    // if in iframe redirect parent site
                    if (this.inIframe()) {
                        window.top.location.href = accessRedirectUrl;
                    }
                    else {
                        window.location.href = accessRedirectUrl;
                    }
                };
                ;
                ShopifyClient.prototype.initApi = function (shopName, firebaseIdToken, cb) {
                    var self = this;
                    // console.log('initApi', shopName, firebaseIdToken);
                    var url = this.apiBaseUrl + "/init/" + this.config.appName + "/" + shopName + "/" + firebaseIdToken + "?callback=?";
                    var jqxhr = $.getJSON(url, function (data, textStatus, jqXHR) {
                        // console.log('greate you are signed in. shop:', data);  
                        self.ready = true; // TODO use event?
                        cb(null, data);
                    });
                    jqxhr.fail(function (xhr, textStatus, errorThrown) {
                        return cb(textStatus);
                    });
                };
                ;
                /**
                 * Get the Access tokens for shopify and firebase if these have already been set
                 * Otherwise get access using this.getAccess with redirections
                 *
                 */
                ShopifyClient.prototype.signIn = function (shopName, callback) {
                    // console.log('signIn');
                    this.initFirebase();
                    var self = this;
                    var url = this.authBaseUrl + "/token/" + this.config.appName + "/" + shopName + "?callback=?";
                    $.getJSON(url, function (data, textStatus, jqXHR) {
                        if (data.status === 404) {
                            console.error('token not found', data);
                            self.getAccess(shopName);
                        }
                        else if (typeof (data.firebaseToken) === 'string') {
                            // console.log('microservice-auth result', data );
                            self.config.firebase.customToken = data.firebaseToken;
                            // this.config.firebase.uid = data.firebaseUid; not needed 
                            self.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function (user) {
                                self.config.firebase.user = user;
                                // console.log('firebase user', user);
                                user.getToken(/* forceRefresh */ true).then(function (firebaseIdToken) {
                                    // console.log('firebaseIdToken', firebaseIdToken);
                                    self.config.firebase.idToken = firebaseIdToken;
                                    // Send token to your backend via HTTPS
                                    self.initApi(shopName, firebaseIdToken, callback);
                                }).catch(function (error) {
                                    // Handle error
                                    callback(error);
                                });
                            }).catch(function (error) {
                                // Handle Errors here.
                                callback(error);
                            });
                        }
                        else {
                            console.error(new Error('Das hätte nicht passieren dürfen, bitte Microservice überprüfen.'));
                        }
                    });
                };
                ;
                ShopifyClient.prototype.singOut = function (accessToken, callback) {
                    var url = this.apiBaseUrl + "/signout/" + this.config.appName + "/" + this.config.shopify.shopName + "?callback=?";
                    var jqxhr = $.getJSON(url, function (data, textStatus, jqXHR) {
                        // console.log('you are signed out:', data);
                        return callback(null, data);
                    });
                    jqxhr.fail(function (xhr, textStatus, errorThrown) {
                        return callback(textStatus);
                    });
                };
                ;
                /**
                 * API calls are based on tthis bindings: https://github.com/MONEI/Shopify-api-node
                 */
                ShopifyClient.prototype.api = function (resource, method, params, callback) {
                    var self = this;
                    if (self.ready) {
                        console.warn('api: ', resource, method);
                        self.call(resource, method, params, callback);
                        return;
                    }
                    else {
                        console.warn(new Error('api not ready, try again..'));
                        // WORKAROUND need better Solution
                        setTimeout(function () {
                            self.api(resource, method, params, callback);
                            return;
                        }, 3000);
                    }
                };
                ;
                ShopifyClient.prototype.deleteMetafield = function (id, callback) {
                    var self = this;
                    self.api('metafield', 'delete', id, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, result);
                    });
                };
                ShopifyClient.prototype.deleteAllMetafield = function (ids, callback) {
                    var self = this;
                    console.log('deleteAllMetafield', ids);
                    self.api('metafield', 'deleteAll', { ids: ids }, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, result);
                    });
                };
                ShopifyClient.prototype.listMetafieldByProduct = function (productId, callback) {
                    var self = this;
                    self.api('metafield', 'list', {
                        metafield: {
                            owner_resource: 'product',
                            owner_id: productId
                        }
                    }, function (err, productMetafields) {
                        if (err) {
                            return callback(err);
                        }
                        return callback(null, productMetafields);
                    });
                };
                ShopifyClient.prototype.listAllProduct = function (cache, fields, callback) {
                    // console.log('listAllProduct', cache, fields);
                    var self = this;
                    if (cache && self.cache && self.cache.listAllProduct && self.cache.listAllProduct[fields]) {
                        return callback(null, self.cache.listAllProduct[fields]);
                    }
                    self.api('product', 'listAll', { fields: fields }, function (error, data) {
                        if (!error && cache) {
                            self.cache.listAllProduct[fields] = data;
                        }
                        callback(error, data);
                    });
                };
                return ShopifyClient;
            }(Api));
            exports_2("ShopifyClient", ShopifyClient);
            VideoAPI = (function (_super) {
                __extends(VideoAPI, _super);
                // public config: ShopifyClientConfig;
                // private _firebase;
                function VideoAPI(config, apiBaseUrl, callback) {
                    var _this = _super.call(this, config, apiBaseUrl) || this;
                    // this.config = config;
                    // console.log('VideoAPI.constructor', this.config);
                    var url = _this.apiBaseUrl + "/init/" + _this.config.appName + "/" + _this.config.shopify.shopName + "/" + _this.config.firebase.idToken + "?callback=?";
                    var jqxhr = $.getJSON(url, function (data, textStatus, jqXHR) {
                        // console.log('ShopifyClient.api result:', data);
                        return callback(null, data);
                    });
                    jqxhr.fail(function (xhr, textStatus, errorThrown) {
                        return callback(textStatus);
                    });
                    return _this;
                    // this.initFirebase();
                }
                VideoAPI.prototype.initFirebase = function () {
                    console.info('VideoAPI initFirebase');
                    // return this._firebase = firebase.initializeApp( this.config.firebase );
                    // console.info('VideoAPI firebase?', this.firebase )
                };
                /**
                 *
                 *
                 */
                VideoAPI.prototype.api = function (resource, method, params, callback) {
                    // console.log('VideoAPI.api request:', resource, method, params);
                    // console.info('VideoAPI.api.config', this.config );
                    return this.call(resource, method, params, callback);
                };
                ;
                /**
                 *
                 *  target url: api/:appName/:shopName/thumbnail/delete
                 */
                VideoAPI.prototype.createThumbnail = function (dataURL, shopName, productID) {
                    return new Promise(function (resolve, reject) {
                        // console.info('VideoAPI.api.config', this.config );
                        // let firebase =  shopifyClient.firebase;
                        // let storageRef = firebase.storage().ref().child( shopName + '/' + productID + '/poster.png' );
                        resolve('OK');
                        // storageRef.put(file).then( (snapshot) => {
                        //     console.log('Uploaded a blob or file!',snapshot)
                        //     console.log(snapshot.a.downloadURLs[0])
                        // })
                        // let resource = 'thumbnail';
                        // let method = 'create';
                        // let params = {
                        //     currentTime: currentTime,
                        //     videoName: videoName
                        // };
                        // this.call( resource, method, params, () => {
                        //     resolve();
                        // });
                        // console.info('result: ', result);
                        // const el = this.elementRef.nativeElement.cloneNode(true);
                    });
                };
                ;
                /**
                 *
                 */
                VideoAPI.prototype.deleteVideo = function (productID, firebaseIdToken, callback) {
                    var resource = 'video';
                    var method = 'delete';
                    return this.call(resource, method, {
                        productID: productID,
                        firebaseIdToken: firebaseIdToken,
                    }, callback);
                };
                ;
                return VideoAPI;
            }(Api));
            exports_2("VideoAPI", VideoAPI);
        }
    };
});
//# sourceMappingURL=shopify-client.js.map