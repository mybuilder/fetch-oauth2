/*global Promise */

import applyMiddleware from './utils/applyMiddleware';
import Config from './utils/config';
import fetchWithConfig from './utils/fetchWithConfig';

export default function fetchWithMiddleware(...middlewares) {
    return (uri, opts) => {
        return applyMiddleware
            (...middlewares)
            (config => config.then(fetchWithConfig))
            (Promise.resolve(new Config({uri, opts})));
    }
}
