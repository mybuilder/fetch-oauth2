/*global Promise */

import preventRaceCondition from './utils/preventRaceCondition.js';

export default function tokenStorage({initialToken, fetchToken, generateToken}) {
    let _token = initialToken;

    let _fetchToken = fetchToken ? preventRaceCondition(fetchToken) : () => Promise.reject(new Error('Getting a token from the server is not supported'));
    let _generateToken = generateToken ? preventRaceCondition(generateToken) : () => Promise.reject(new Error('Generating a token on the server is not supported'));

    const getToken = () => {
        if (_token) {
            return Promise.resolve(_token);
        }

        return _fetchToken()
            .then(newToken => _token = newToken)
            .catch(_generateToken);
    };

    const refreshToken = () => {
        _token = undefined;

        return _generateToken()
            .then(newToken => _token = newToken);
    };

    return {
        getToken,
        refreshToken
    };
}
