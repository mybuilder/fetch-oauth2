Fetch JS wrapper to allow OAuth2 authenticated requests
=======================================================

Based on a fetch.js, and allows creating a authenticated request to an api with oauth2 `access_token`. In addition to handling OAuth2 tokens it prevents race conditions between request when token needs to be generated or fetched.

[![Build Status](https://travis-ci.org/mybuilder/fetch-oauth2.svg?branch=master)](https://travis-ci.org/mybuilder/fetch-oauth2)

## Install from npm
```
npm install fetch-oauth2 --save
```

### Token storage

Storage takes 3 functions, and all of them are optional and must return a `Promise`, but you should pass in at least one of them it depends on the application.

```javascript
import {tokenStorage} from 'fetch-oauth2';

const storage = tokenStorage({initialToken, fetchToken, generateToken});
```

* `fetchToken` is an equivalent to a http `GET`, and can `reject` the promise when no token is found
* `generateToken` is an equivalent to a http `POST`, and should generate a new token

### Request

```javascript
import {fetchWithMiddleware, middleware} from 'fetch-oauth2';

const oauth2Fetch = fetchWithMiddleware(middleware.authorisationChallengeHandler(storage), middleware.setOAuth2Authorization(storage));

oauthFetch('http://httpbin.org/get')
    .then(response => /**/)
    .catch(error => /**/)
```

#### setOAuth2Authorization middleware

Handles adding the `Authorization: Bearer abc123` header to the request.

#### authorisationChallengeHandler middleware

Handles responses with expired and invalid token's. When the response is 401, this hook will generate a new token and retry the request using the generated token.

You can optionally pass in a function that tests for the authentication challenge.

```javascript
authorisationChallengeHandler(storage, (response) => Response.resolve(true))
```

### A simple url rewrite

Assuming that the api uri's are relative then its easy to add a simple middleware to add the host.

```javascript
function addHostToUrl(next) {
    return configPromise => {
        return next(configPromise.then(config => config.updateUri(uri => 'http://httpbin.org' + uri)));
    }
}

const oauth2Fetch = fetchWithMiddleware(addHostToUrl, ...);

oauth2Fetch('/get')
```

## Contributing

The simplest why is to run test through npm.

`npm test`

If you would like to use wallaby.js then you need to start the test server.

`npm start`
