/**
 * Main Constructor
 * @param options - optional cookie name to set and server endpoint to use
 * @constructor
 */
var BasketCookie = function(options){
    // Set the version
    this.version = '1.0';
    this.productCookie = (typeof options === 'undefined') ? 'productData' : options.productCookie;
    this.serverEndpoint = (typeof options === 'undefined') ? '/cart' : options.serverEndpoint;
    /**
     * Test if element has specific class
     * @param el - element to be tested
     * @param className - classname to be found
     * @returns {boolean}
     */
    this.hasClass = function(el, className){
        if(el && className){

            if (el.classList)
                return el.classList.contains(className);
            else
                return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
        }
        return false;
    };

    /**
     * Finds a cookie by name and return cookie value or false
     * @param cookieName - name of the cookie to be found
     * @returns {*}
     */
    this.findCookie = function(cookieName){
        // Get all cookies as an array
        var allCookies = document.cookie.split(';'),
            cName = cookieName + '=';
        // Iterate over and check if the cookie is in there
        for(var j = 0; j < allCookies.length; j++){
            var c = allCookies[j];
            while (c.charAt(0)== ' ') c = c.substring(1);
            if (c.indexOf(cName) == 0) return c.substring(cName.length,c.length);
        }
        return false;
    };

    /**
     * Checks if two objects are equal
     * @param obj1
     * @param obj2
     * @returns {boolean}
     */
    this.compareDataObjects = function(obj1, obj2){
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    };

    /**
     * Calculate six months in future
     * @returns {Date}
     */
    this.calculateExpireDate = function(){
        return new Date(Date.now() + 1.57785e10);
    };

    /**
     * Handle all possible cases of basket-cookie relation
     * @returns {*}
     */
    this.handleBasketData = function(){
        // Get all needed data
        var basketData = JSON.parse(getProductData()),
            cookieData = findCookie(this.productCookie),
            expireDate = calculateExpireDate(),
            cStr;
        // No items in the basket, but we have cookie already set
        if(cookieData && !basketData){
            // Add the items from the cookie to the basket
            addItemsToBasket(JSON.parse(cookieData));
        }
        // We have items in the basket and we have the cookie set
        else if(cookieData && basketData){
            // Compare both JSON data sets, we only care if they are not the same.
            // In that case update the cookie with the basket items.
            if(!compareDataObjects(cookieData, basketData)){
                cStr = this.productCookie +"="+ JSON.stringify(basketData) +"; expires=" + expireDate;
                document.cookie = cStr;
            }
            return basketData
        }
        // No cookie, but items in the basket e.g. first visit on the basket page.
        else if(!cookieData && basketData) {
            cStr = this.productCookie +"="+ JSON.stringify(basketData) +"; expires=" + expireDate;
            document.cookie = cStr;
            return basketData;
        }
        // No cookie, no items in the basket, try to delete cookie anyway
        else if(!cookieData && !basketData){
            document.cookie = this.productCookie+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
            return false;
        }
    };

    /**
     * Add items to the basket via the /cart/quickAdd endpoint
     * Initiate ajax request for eache entry in the provided JSON data set
     * @param dataSet - JSON with the products to be added
     * @returns {*}
     */
    this.addItemsToBasket = function(dataSet){
        // Check the input data
        if(dataSet && typeof dataSet === 'object'){
            // Cache the elements needed
            var productsCount = dataSet.length, addedProducts = [],
                qcHeaderItems = document.querySelector('div.quickCartSection li.items span'),
                qcHeaderValue = document.querySelector('div.quickCartSection li.total span');
            // Iterate over the JSON data
            if (typeof jQuery === 'undefined'){
                function updateQuickCartHeader(res){
                    addedProducts.push(res);
                    qcHeaderItems.innerHTML = res.quickCartItems;
                    qcHeaderValue.innerHTML = res.quickCartValue;
                }
                for(var k = 0; k < productsCount; k++) {
                    var request = new XMLHttpRequest();
                    request.onload = updateQuickCartHeader;
                    request.open("POST", this.serverEndpoint, true);
                    request.send();
                }
            } else {
                for(var k = 0; k < productsCount; k++){
                    var _this = dataSet[k];
                    // Make request
                    $.ajax({
                        type: 'POST',
                        url: this.serverEndpoint,
                        data: _this
                    }).done(function(res){
                        // On success update the quick cart header and store the result
                        addedProducts.push(res);
                        qcHeaderItems.innerHTML = res.quickCartItems;
                        qcHeaderValue.innerHTML = res.quickCartValue;
                    }).fail(function(err){
                        // If error ... log it
                        console.log(err);
                    });
                }
            }
            // Return array with the result of each request or false
            return addedProducts;
        }
        return false;
    };

    /**
     * Deletes the custom set cookies
     * @returns {boolean}
     */
    this.deleteCustomCookie = function(cookieName){
        if(cookieName){
            document.cookie = cookieName+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
            return true;
        }
    }

};

/**
 * Creates JSON data for every product added to the basket
 * Specific for every implementation
 * @returns {*}
 */
BasketCookie.prototype.getProductData = function(obj1, obj2){
    var productList = document.querySelectorAll('.shoppingCartDet tbody tr'),
        buffer = [], productCount = productList.length;
    // If products are actually added to the basket
    if(productCount > 0) {
        // Iterate over and collect data
        for (var i = 0; i < productCount; i++) {
            // Build JSON in specific schema
            var currentItem = {
                sku: productList[i].querySelector('.item-sku').textContent
            };
            currentItem[currentItem.sku + '.qty'] = productList[i].querySelector('.item-qty').value;
            buffer.push(currentItem);
        }
        return JSON.stringify(buffer);
    }
    else {
        // Return false if no items added to the basket
        return false;
    }
};

document.addEventListener('DOMContentLoaded', function(){
    var myBasketCookie = new BasketCookie({
        productCookie: 'prData'
    });
    console.log(myBasketCookie);
});

