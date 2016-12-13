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
      apiKey: shopifyApp.config.shopifyApp.apiKey,
      shopOrigin: protocol + shop,
      debug: shopifyApp.config.shopifyApp.debug
    }
    
    // console.log("init Embedded SDK with config", initSDKConfig);
    
    ShopifyApp.init(initSDKConfig);
    
    // should be ready after success auth
    ShopifyApp.ready(function () {
        //console.log("READY YEA!");
                
        shopifyApp.signIn(shopifyApp.config.shopifyApp.shopName, function(error, initApiRes) {
            if(error) {
                callback(null, error);
                console.error(new Error(error));
                return shopifyApp.getAccess(shopifyApp.config.shopifyApp.shopName);
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
    shopifyApp.firebase = firebase.initializeApp(shopifyApp.config.firebase);
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
 * Set the shop domain and shop name by the shop domain in shopifyApp.config.shopifyApp
 */
shopifyApp.setShop = function (shop) {
    shopifyApp.config.shopifyApp.shop = shop;
    shopifyApp.config.shopifyApp.shopName = shopifyApp.getShopName(shopifyApp.config.shopifyApp.shop);
    //console.log("setShop", shop, shopifyApp.config.shopifyApp);
};

/**
 * Set the shop domain and shop name by the shop name in shopifyApp.config.shopifyApp
 */
shopifyApp.setShopName = function (shopName) {
    shopifyApp.config.shopifyApp.shop = shopifyApp.getShop(shopName);
    shopifyApp.config.shopifyApp.shopName = shopName;
    //console.log("setShopName", shopName, shopifyApp.config.shopifyApp);
};

/**
 * Set the access token in config.shopifyApp
 */
shopifyApp.setToken = function (accessToken) {
    shopifyApp.config.shopifyApp.accessToken = accessToken;
};

/**
 * Initiates the sign-in flow using Shopify oauth sign in
 * 
 */
shopifyApp.getAccess = function (shopName) {
    //console.log("getAccess", shopName);
    var accessRedirectUrl = shopifyApp.config.shopifyApp.microserviceAuthBaseUrl+'/redirect/'+shopifyApp.config.appName+'/'+shopName;
    
    // if in iframe redirect parent site
    if(shopifyApp.inIframe()) {
        window.top.location.href = accessRedirectUrl;
    } else {
        window.location.href = accessRedirectUrl;
    }  
};

shopifyApp.initApi = function (shopName, firebaseIdToken, callback) {
    //console.log("initApi", shopName, firebaseIdToken);
    $.getJSON( shopifyApp.config.shopifyApp.microserviceApiBaseUrl+"/init/"+shopifyApp.config.appName+"/"+shopName+"/"+firebaseIdToken+"?callback=?", function( res ) {
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
            
    $.getJSON( shopifyApp.config.shopifyApp.microserviceAuthBaseUrl+"/token/"+shopifyApp.config.appName+"/"+shopName+"?callback=?", function( data ) {
                
        if(data.status === 404) {
            console.error("token not found", data );
            shopifyApp.getAccess(shopName);
        } else if(_.isString(data.firebaseToken)) {
            
            //console.log("token", data.firebaseToken );
            
            shopifyApp.config.firebase.customToken = data.firebaseToken;
            // shopifyApp.config.firebase.uid = data.firebaseUid; not needed 
                      
            shopifyApp.firebase.auth().signInWithCustomToken(data.firebaseToken).then(function(user) {
                shopifyApp.config.firebase.user = user;
                //console.log("firebase user", user);
                user.getToken(/* forceRefresh */ true).then(function(firebaseIdToken) {
                    //console.log("firebaseIdToken", firebaseIdToken);
                    shopifyApp.config.firebase.idToken = firebaseIdToken;
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
    $.getJSON( shopifyApp.config.shopifyApp.microserviceApiBaseUrl+"/signout/"+shopifyApp.config.appName+"/"+shopName+"?callback=?", function( result ) {
        console.log("you are signed out:", result);  
    });
};

shopifyApp.api = function (resource, method, params, callback) {
    // console.log('service:', shopifyApp.config.shopifyApp.microserviceApiBaseUrl+"/api/"+shopifyApp.config.appName+"/"+shopifyApp.config.shopifyApp.shopName+"/"+resource+"/"+method+"?callback=?");
    $.getJSON( shopifyApp.config.shopifyApp.microserviceApiBaseUrl+"/api/"+shopifyApp.config.appName+"/"+shopifyApp.config.shopifyApp.shopName+"/"+resource+"/"+method+"?callback=?", function( result ) {
        console.log("api:", result);  
        callback(null, result);
    });
};

