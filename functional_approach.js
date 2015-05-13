/**
 * Copyright (c) 2007-2015 Powa Technologies Limited. All Rights Reserved.
 *
 * Distribution, copy or usage of any part of this file is prohibited without
 * written consent of Powa Technologies Limited.
 *
 * Created by Momchil Gorchev on 05/05/15.
 */


/**
 * Constants
 * @type {string}
 */
var PRODUCT_COOKIE_NAME = 'productData',
    SERVER_ENDPOINT = '/cart/quickAdd',
    VERSION = '1.0.0';

/**
 * Test if element has specific class
 * @param el - element to be tested
 * @param className - classname to be found
 * @returns {boolean}
 */
function hasClass(el, className){
    if (el.classList)
        return el.classList.contains(className);
    else
        return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
}

/**
 * Finds a cookie by name and return cookie value or false
 * @param cookieName - name of the cookie to be found
 * @returns {*}
 */
function findCookie(cookieName){
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
}

/**
 * Checks if two objects are equal
 * @param obj1
 * @param obj2
 * @returns {boolean}
 */
function compareDataObjects(obj1, obj2){
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * Creates JSON data for every product added to the basket
 * @returns {*}
 */
function getProductData(){
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
}

/**
 * Calculate six months in future
 * @returns {Date}
 */
function calculateExpireDate(){
    return new Date(Date.now() + 1.57785e10);
}

/**
 * Handle all possible cases of basket-cookie relation
 * @returns {*}
 */
function handleBasketData(){
    // Get all needed data
    var basketData = JSON.parse(getProductData()),
        cookieData = findCookie(PRODUCT_COOKIE_NAME),
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
            cStr = PRODUCT_COOKIE_NAME +"="+ JSON.stringify(basketData) +"; expires=" + expireDate;
            document.cookie = cStr;
        }
        return basketData
    }
    // No cookie, but items in the basket e.g. first visit on the basket page.
    else if(!cookieData && basketData) {
        cStr = PRODUCT_COOKIE_NAME +"="+ JSON.stringify(basketData) +"; expires=" + expireDate;
        document.cookie = cStr;
        return basketData;
    }
    // No cookie, no items in the basket, try to delete cookie anyway
    else if(!cookieData && !basketData){
        document.cookie = PRODUCT_COOKIE_NAME+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        return false;
    }
}

/**
 * Add items to the basket via the /cart/quickAdd endpoint
 * Initiate ajax request for eache entry in the provided JSON data set
 * @param dataSet - JSON with the products to be added
 * @returns {*}
 */
function addItemsToBasket(dataSet){
    // Check the input data
    if(dataSet && typeof dataSet === 'object'){
        // Cache the elements needed
        var productsCount = dataSet.length, addedProducts = [],
            qcHeaderItems = document.querySelector('div.quickCartSection li.items span'),
            qcHeaderValue = document.querySelector('div.quickCartSection li.total span');
        // Iterate over the JSON data
        for(var k = 0; k < productsCount; k++){
            var _this = dataSet[k];
            // Make request
            $.ajax({
                type: 'POST',
                url: SERVER_ENDPOINT,
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
        // Return array with the result of each request or false
        return addedProducts;
    }
    return false;
}

/**
 * Deletes the custom set cookies
 * @returns {boolean}
 */
function deleteCustomCookies(cookieName){
    if(cookieName){
        document.cookie = cookieName+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        return true;
    }
}

/**
 * Main execution stack, on DOM ready
 */
document.addEventListener('DOMContentLoaded', function(){
    // Cache the body
    var body = document.querySelector('body');
    // If we are on the basket page
    if(hasClass(body, 'pageShoppingCart')){
        // Handle the basket and cookie data
        handleBasketData();
    }
    // On any other page
    else{
        // Check if we have items in the basket and cookie stored
        var headerCartItems = +document.querySelector('div.quickCartSection li.items span').textContent,
            cookieData = findCookie(PRODUCT_COOKIE_NAME);
        // If we have cookie, but no items in the basket, add the cookie data to the basket
        if(headerCartItems === 0 && cookieData){
            addItemsToBasket(cookieData);
            // Then redirect the user to the basket page
            window.location.pathname = '/cart';
        }
    }

    // Get the product data
    var products = JSON.parse(getProductData());
    // If there is product added to the basket
    if(products){
        // Attach event listeners to the Delete button
        var deleteBtns = document.querySelectorAll('button.dlt');
        for (var i = 0; i < deleteBtns.length; i++){
            document.querySelectorAll('button.dlt')[i].addEventListener('click', function(e){
                e.preventDefault();
                e.stopPropagation();
                // If the user deleting the last item in the basket, clear the cookie
                if(products.length === 1){
                    deleteCustomCookies(PRODUCT_COOKIE_NAME);
                }
            });
        }
    }
});
