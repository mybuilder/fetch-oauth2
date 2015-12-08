/*global Promise */

import fetchWithConfig from './utils/fetchWithConfig';

export function setOAuth2Authorization({getToken}) {
    return next => config => {
        return next(config.then(config => getToken().then(token => config.setAccessToken(token))));
    }
}

export function authorisationChallengeHandler({refreshToken}, test = testResponseAuthorisationChallange) {
    return next => config => {
        return next(config)
            .then(response => {
                return test(response)
                    .then(isAuthorisationChallenge => {
                        if (isAuthorisationChallenge) {
                            return Promise.all([refreshToken(), config])
                                .then(([token, config]) => config.setAccessToken(token))
                                .then(fetchWithConfig)
                        }

                        return response;
                    })
            });
    }
}

function testResponseAuthorisationChallange(response) {
    if (response.status == 401) {
        return Promise.resolve(true);
    }

    return Promise.resolve(false);
}
