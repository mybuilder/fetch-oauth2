/*global Promise */

import applyMiddleware from './utils/applyMiddleware.js';
import Config from './utils/config.js';
import fetchWithConfig from './utils/fetchWithConfig.js';

export default function fetchWithMiddleware(...middlewares) {
    return (uri, opts) => {
        return applyMiddleware
            (...middlewares)
            (config => config.then(fetchWithConfig))
            (Promise.resolve(new Config({uri, opts})));
    }
}
