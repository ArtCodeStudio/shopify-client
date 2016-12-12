if(!shopifyApp) {
    var shopifyApp = {};
}


/**
 * Identify if a webpage is being loaded inside an iframe or directly into the browser window
 * @see http://stackoverflow.com/a/326076
 */
shopifyApp.inIframe = function  () {
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
shopifyApp.getQueryParams = function (qs) {
    qs = qs.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}

shopifyApp.initEmbeddedSDK = function (protocol, shop, callback) {
    var initSDKConfig = {
      apiKey: window.config.shopifyApp.apiKey,
      shopOrigin: protocol + shop,
      debug: window.config.shopifyApp.debug
    }
    
    // console.log("init Embedded SDK with config", initSDKConfig);
    
    ShopifyApp.init(initSDKConfig);
    
    // should be ready after success auth
    ShopifyApp.ready(function () {
        //console.log("READY YEA!");
                
        shopifyApp.signIn(window.config.shopifyApp.shopName, function(error, initApiRes) {
            if(error) {
                callback(null, error);
                console.error(new Error(error));
                return shopifyApp.getAccess(window.config.shopifyApp.shopName);
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
shopifyApp.initShopify = function (protocol, shop, shopName, callback) {
    //console.log("initShopify", protocol, shop, shopName);
    
    // init shopify if this is in iframe, if not get access and redirect back to the shopify app page
    if(shopifyApp.inIframe()) {
        //console.log("Backend is in iframe");
        shopifyApp.initEmbeddedSDK(protocol, shop, callback);    
    } else {
        console.error("Backend is not in iframe");
        shopifyApp.getAccess(shopName); // get access and redirect back to the shopify app page
    }
}

shopifyApp.initFirebase = function  () {
    //console.log("initFirebase");
    shopifyApp.firebase = firebase.initializeApp(config.firebase);
}


/**
 * Get CURRENT_LOGGED_IN_SHOP from CURRENT_LOGGED_IN_SHOP.myshopify.com
 */
shopifyApp.getShopName = function (shop) {
    return shop.substring(0, shop.indexOf("."));
};

/**
 * Get the shop domain e.g. CURRENT_LOGGED_IN_SHOP.myshopify.com from the shop name e.g. CURRENT_LOGGED_IN_SHOP 
 */
shopifyApp.getShop= function (shopName) {
    return shopName + '.myshopify.com';
};


/**
 * Set the shop domain and shop name by the shop domain in config.shopifyApp
 */
shopifyApp.setShop = function (shop) {
    config.shopifyApp.shop = shop;
    config.shopifyApp.shopName = shopifyApp.getShopName(config.shopifyApp.shop);
    //console.log("setShop", shop, config.shopifyApp);
};

/**
 * Set the shop domain and shop name by the shop name in config.shopifyApp
 */
shopifyApp.setShopName = function (shopName) {
    config.shopifyApp.shop = shopifyApp.getShop(shopName);
    config.shopifyApp.shopName = shopName;
    //console.log("setShopName", shopName, config.shopifyApp);
};

/**
 * Set the access token in config.shopifyApp
 */
shopifyApp.setToken = function (accessToken) {
    config.shopifyApp.accessToken = accessToken;
};

/**
 * Initiates the sign-in flow using Shopify oauth sign in
 * 
 */
shopifyApp.getAccess = function (shopName) {
    //console.log("getAccess", shopName);
    var accessRedirectUrl = config.shopifyApp.microserviceAuthBaseUrl+'/redirect/'+window.config.appName+'/'+shopName;
    
    // if in iframe redirect parent site
    if(shopifyApp.inIframe()) {
        window.top.location.href = accessRedirectUrl;
    } else {
        window.location.href = accessRedirectUrl;
    }  
};

shopifyApp.initApi = function (shopName, firebaseIdToken, callback) {
    //console.log("initApi", shopName, firebaseIdToken);
    $.getJSON( config.shopifyApp.microserviceApiBaseUrl+"/init/"+window.config.appName+"/"+shopName+"/"+firebaseIdToken+"?callback=?", function( res ) {
        //console.log("greate you are signed in. shop:", res);  
        callback(null, res);
    });
};

/**
 * Get the Access tokens for shopify and firebase if these have already been set
 * Otherwise get access using shopifyApp.getAccess with redirections
 * 
 */
shopifyApp.signIn = function (shopName, callback) {
    //console.log("signIn");
    
    shopifyApp.initFirebase();
            
    $.getJSON( config.shopifyApp.microserviceAuthBaseUrl+"/token/"+window.config.appName+"/"+shopName+"?callback=?", function( data ) {
                
        if(data.status === 404) {
            console.error("token not found", data );
            shopifyApp.getAccess(shopName);
        } else if(_.isString(data.firebaseToken)) {
            
            //console.log("token", data.firebaseToken );
            
            window.config.firebase.customToken = data.firebaseToken;
            // window.config.firebase.uid = data.firebaseUid; not needed 
                      
            shopifyApp.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function(user) {
                window.config.firebase.user = user;
                //console.log("firebase user", user);
                user.getToken(/* forceRefresh */ true).then(function(firebaseIdToken) {
                    //console.log("firebaseIdToken", firebaseIdToken);
                    window.config.firebase.idToken = firebaseIdToken;
                    // Send token to your backend via HTTPS
                    shopifyApp.initApi(shopName, firebaseIdToken, callback);
                     
                }).catch(function(error) {
                    // Handle error
                    callback(error);
                });
            
            }).catch(function(error) {
                // Handle Errors here.
                callback(error);
            });        
        } else {
            console.error(new Error("Das hätte nicht passieren dürfen, bitte Microservice überprüfen."));
        }
        
    });
};

shopifyApp.singOut = function (accessToken, callback) {
    $.getJSON( config.shopifyApp.microserviceApiBaseUrl+"/signout/"+window.config.appName+"/"+shopName+"?callback=?", function( result ) {
        console.log("you are signed out:", result);  
    });
};

shopifyApp.api = function (resource, method, params, callback) {
    // console.log('service:', config.shopifyApp.microserviceApiBaseUrl+"/api/"+window.config.appName+"/"+window.config.shopifyApp.shopName+"/"+resource+"/"+method+"?callback=?");
    $.getJSON( config.shopifyApp.microserviceApiBaseUrl+"/api/"+window.config.appName+"/"+window.config.shopifyApp.shopName+"/"+resource+"/"+method+"?callback=?", function( result ) {
        console.log("api:", result);  
        callback(null, result);
    });
};

