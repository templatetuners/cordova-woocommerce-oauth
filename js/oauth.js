var CONFIG = {
    site_url: 'https://www.site.com',
    wc_consumer_key: 'ck_xxxxxxxxxxxxxx', 
    wc_consumer_secret: 'cs_xxxxxxxxxxxxxx',
    oauth_signature_method: 'HMAC-SHA256',
    wc_api_endpoint: '/wp-json/wc/v2',
    //wp_api_endpoint: '/wp-json/wp/v2',
    request_timeout: 6000
}
var encodeString = function(value) {
    return encodeURIComponent(value).replace("%5B", "%255B").replace("%5D", "%255D");
};
var genRandomNonce = function() {
    var time = new Date().valueOf().toFixed().toString() + String(Math.random());
    var s = sjcl.hash.sha256.hash(time);
    var hash = sjcl.codec.hex.fromBits(s);
    return encodeString(hash);
};
var prepareHTTPQueryString = function(http_method, url, CONFIG, extra_params) {
    var oauth_params = {
        oauth_consumer_key: CONFIG.wc_consumer_key,
        oauth_nonce: genRandomNonce(),
        oauth_signature_method: CONFIG.oauth_signature_method,
        oauth_timestamp: (new Date().valueOf() / 1000).toFixed().toString(), // UNIX timestamp
        oauth_version: "1.0"
    };
    for (var key in extra_params)
        oauth_params[key] = extra_params[key];
    var scraped_url = url.replace("/index.php", "");
    var signatureBaseString = http_method + "&" + encodeURIComponent(scraped_url) + "&";
    var params = [];
    for (var key in oauth_params)
        params.push(encodeString(key + "=" + oauth_params[key] + '&'));
    params.sort();
    for (var v in params)
        signatureBaseString += params[v];
    signatureBaseString = signatureBaseString.slice(0, -3);
    var consumer_secret = CONFIG.wc_consumer_secret;
    if (url.indexOf("wc-api/v3") != -1)
        consumer_secret = consumer_secret + '&';
    var key = sjcl.codec.utf8String.toBits(consumer_secret);
    var out = (new sjcl.misc.hmac(key)).mac(signatureBaseString);
    var signature = sjcl.codec.base64.fromBits(out);
    if (CONFIG.oauth_signature_method === 'HMAC-SHA1') {
        signature = oauthSignature.generate(http_method, scraped_url, oauth_params, CONFIG.wc_consumer_secret);
    }
    oauth_params['oauth_signature'] = encodeURIComponent(signature);
    url += '?';
    for (var key in oauth_params)
        url += key + '=' + oauth_params[key] + '&';
    url = url.slice(0, -1);
    return url;
};
var generateQuery = function(http_method, call, CONFIG, extra_params) {
    extra_params = extra_params || {};
    var json = CONFIG.site_url + CONFIG.wc_api_endpoint + call;
    switch (CONFIG.site_url.split("://")[0]) {
        case "http":
            json = prepareHTTPQueryString(http_method, json, CONFIG, extra_params);
            break;
        case "https":
            json += '?consumer_key=' + CONFIG.wc_consumer_key + '&consumer_secret=' + CONFIG.wc_consumer_secret;
            for (var key in extra_params)
                json += '&' + key + '=' + extra_params[key];
            break;
        default:
            throw Error("Protocol not supported.");
    }
    return json;
};