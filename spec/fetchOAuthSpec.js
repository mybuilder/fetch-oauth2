/*global describe, it, Promise */

import expect from 'expect.js';
import fetchWithMiddleware from '../src/fetchWithMiddleware';
import { setOAuth2Authorization, authorisationChallengeHandler } from '../src/middleware';
import tokenStorage from '../src/tokenStorage';

let server = require('../test_server_port.json');

function addHostToUrl(next) {
    return config => {
        return next(config.then(config => config.updateUri(uri => 'http://localhost:' + server.port + uri)));
    }
}

const fetchToken = () => {
    return fetchWithMiddleware(addHostToUrl)(
        '/token',
        {method: 'GET'}
    )
    .then(response => {
        if (response.ok) {
            return response.json()
        }

        let error = new Error("Token not found");
        error.response = response;

        throw error;
    });
};

const fetchTokenNotFound = () => {
    return fetchWithMiddleware(addHostToUrl)(
        '/token/404',
        { method: 'GET'}
    )
    .then(response => {
        if (response.ok) {
            return response.json()
        }

        let error = new Error("Token not found");
        error.response = response;

        throw error;
    });
};

const generateToken = () => {
    return fetchWithMiddleware(addHostToUrl)(
        '/token',
        {method: 'PUT'}
    )
    .then(response => {
        if (response.ok) {
            return response.json()
        }

        let error = new Error("Token not found");
        error.response = response;

        throw error;
    })
};

const rejectFetchToken = () => Promise.reject(new Error('Should not be called'));
const validToken = {access_token: 'abc123', token_type: 'Bearer'};
const expiredToken = {access_token: 'expired', token_type: 'Bearer'};

describe("Complete examples", () => {
    it("should handle request authorization, and authorisation challenge when token expires", done => {
        const storage = tokenStorage({initialToken: expiredToken, fetchToken, generateToken});

        fetchWithMiddleware(addHostToUrl, authorisationChallengeHandler(storage), setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => response.json())
        .then(response => expect(response).to.be.eql({data: 'foo'}))

        // test error handling
        .then(() => done())
        .catch(error => done(error));
    });
});

describe("token storage", () => {
    it("should fetch the token", done => {
        const storage = tokenStorage({fetchToken});

        storage
            .getToken()
            .then(token => {
                expect(token).to.be.eql(validToken);
            })
            .then(() => done(), error => done(error));
    });

    it("should get the local token", done => {
        const storage = tokenStorage({initialToken: validToken, fetchToken: rejectFetchToken});

        storage
            .getToken()
            .then(token => {
                expect(token).to.be.eql(validToken);
            })
            .then(() => done(), error => done(error));
    });

    it("should generate a new the token if not found on the server", done => {
        const storage = tokenStorage({
            fetchToken: () => fetchTokenNotFound(),
            generateToken
        });

        storage
            .getToken()
            .then(token => {
                expect(token).to.be.eql(validToken);
            })
            .then(() => done(), error => done(error));
    });

    it("should prevent race condition on getToken", done => {
        const storage = tokenStorage({
            fetchToken: onlyOnce(fetchToken)
        });

        Promise.all([
            storage.getToken(),
            storage.getToken()
        ])
        .then(all => expect(all).to.be.eql([validToken, validToken]))
        .then(response => done())
        .catch(error => done(error));
    });

    it("should generate new tokens", done => {
        let called = 0;
        const storage = tokenStorage({
            generateToken: () => {
                return Promise.resolve(called++);
            }
        });

        storage
        .refreshToken()
        .then(token => expect(token).to.be.equal(0))

        .then(storage.refreshToken)
        .then(token => expect(token).to.be.equal(1))

        .then(storage.refreshToken)
        .then(token => expect(token).to.be.equal(2))

        .then(response => done())
        .catch(error => done(error));
    });

    it("should prevent race condition on refreshToken", done => {
        const storage = tokenStorage({
            generateToken: onlyOnce(generateToken)
        });

        Promise.all([
            storage.refreshToken(),
            storage.refreshToken(),
            storage.refreshToken()
        ])
        .then(all => expect(all).to.be.eql([validToken, validToken, validToken]))
        .then(response => done())
        .catch(error => done(error));
    });
});

describe("Authentication token", () => {
    it("should deny access when no token provided", done => {
        fetchWithMiddleware(addHostToUrl)(
            '/secured',
            {method: 'GET'}
        )
        .then(response => {
            expect(response.headers.get('WWW-Authenticate')).to.be.equal('Bearer realm="example"');
            expect(response.status).to.be.equal(401);

            return response;
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should allow access with a valid token", done => {
        fetchWithMiddleware(addHostToUrl)(
            '/secured',
            {method: 'GET', headers: {authorization: 'Bearer abc123'}}
        )
        .then(response => {
            expect(response.status).to.be.equal(200);

            return response.json();
        })
        .then(json => {
            expect(json).to.be.eql({data: 'foo'});
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should fetch the access token and then set the Authorization header", done => {
        const storage = tokenStorage({fetchToken});

        fetchWithMiddleware(addHostToUrl, setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => {
            expect(response.status).to.be.equal(200);

            return response.json();
        })
        .then(json => {
            expect(json).to.be.eql({data: 'foo'});
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should fail fetching the token", done => {
        const storage = tokenStorage({fetchToken: fetchTokenNotFound});

        fetchWithMiddleware(addHostToUrl, setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => done(new Error('Should have failed fetching the token')))
        .catch(error => done());
    });

    it("should generate a new token if failed fetching the token", done => {
        const storage = tokenStorage({fetchToken: fetchTokenNotFound, generateToken});

        fetchWithMiddleware(addHostToUrl, setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => {
            expect(response.status).to.be.equal(200);

            return response.json();
        })
        .then(data => expect(data).to.be.eql({data: 'foo'}))
        .then(() => done())
        .catch(error => done(error));
    });

    it("should fetch the access token from local storage", done => {
        const storage = tokenStorage({
            initialToken: validToken,
            fetchToken: rejectFetchToken
        });

        fetchWithMiddleware(addHostToUrl, setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => {
            expect(response.status).to.be.equal(200);

            return response.json();
        })
        .then(json => {
            expect(json).to.be.eql({data: 'foo'});
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should prevent race conditions while fetching the token", done => {
        const storage = tokenStorage({fetchToken: onlyOnce(fetchToken)});

        Promise.all([
            fetchWithMiddleware(addHostToUrl, setOAuth2Authorization(storage))(
                '/secured',
                {method: 'GET'}
            ),
            fetchWithMiddleware(addHostToUrl, setOAuth2Authorization(storage))(
                '/secured',
                {method: 'GET'}
            )
        ])
        .then(all => Promise.all(all.map(r => r.json())))
        .then(all => expect(all).to.be.eql([{data: 'foo'}, {data: 'foo'}]))
        .then(response => done())
        .catch(error => done(error));
    });

    it("should retry the request with a new token if the token was expired", done => {
        const storage = tokenStorage({initialToken: expiredToken, fetchToken, generateToken});

        fetchWithMiddleware(addHostToUrl, authorisationChallengeHandler(storage), setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => {
            if (response.status == 401) {
                throw new Error("Should have reloaded the token");
            }

            expect(response.status).to.be.equal(200);

            return response;
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should pass through the response if its not authorisation challenge", done => {
        const storage = tokenStorage({fetchToken});

        fetchWithMiddleware(addHostToUrl, authorisationChallengeHandler(storage), setOAuth2Authorization(storage))(
            '/secured',
            {method: 'GET'}
        )
        .then(response => {
            if (response.status == 401) {
                throw new Error("Should have reloaded the token");
            }

            expect(response.status).to.be.equal(200);

            return response;
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should prevent a race condition on authorisation challenge if token is expired", done => {
        const storage = tokenStorage({initialToken: expiredToken, fetchToken: onlyOnce(fetchToken), generateToken: onlyOnce(generateToken)});

        Promise.all([
            fetchWithMiddleware(addHostToUrl, authorisationChallengeHandler(storage), setOAuth2Authorization(storage))(
                '/secured',
                {method: 'GET'}
            ),
            fetchWithMiddleware(addHostToUrl, authorisationChallengeHandler(storage), setOAuth2Authorization(storage))(
                '/secured',
                {method: 'GET'}
            )
        ])
        .then(all => Promise.all(all.map(r => r.json())))
        .then(all => expect(all).to.be.eql([{data: 'foo'}, {data: 'foo'}]))
        .then(response => done())
        .catch(error => done(error));
    });

});

describe("Pre request hooks", () => {
    it("should accept a promise", done => {
        function delayedUrlUpdate(config) {
            return new Promise((resolve, _) => {
                setTimeout(() => {
                    resolve(config.updateUri(uri => 'http://localhost:' + server.port + uri));
                }, 50);
            });
        }

        const changeConfigHook = next => promise => {
            return next(promise.then(delayedUrlUpdate));
        };

        fetchWithMiddleware(changeConfigHook)(
            '/request',
            {method: 'GET'}
        )
        .then(response => {
            expect(response.ok).to.be.equal(true);

            return response;
        })
        .then(response => done())
        .catch(error => done(error));
    });

    it("should fails on pre hook", done => {
        const fail = next => config => Promise.reject(new Error('Failing on post hook'));

        fetchWithMiddleware(fail)(
            '/request',
            {method: 'GET'}
        )
        .then(() => done(new Error('Should have failed in post hook')))
        .catch(error => done());
    });

    describe("authorisation with cookies", () => {
        // TODO not really relevant

        //beforeEach(() => {
        //    request({uri: '/cookie?name=sessionKey&value=def123', opts: {credentials: 'same-origin'}, preRequest: [addHostToUrl]});
        //});

        //it("should have a session cookie", done => {
        //    request({uri: '/cookie?name=sessionKey', opts: {credentials: 'same-origin'}, preRequest: [addHostToUrl]})
        //        .then(response => response.text())
        //        .then(text => expect(text).to.be.eql('def123'))
        //        .then(() => done(), error => done(error));
        //});
    });
});

describe("Error handlers", () => {
    it("should be network error", done => {
        const catchError = next => promise => {
            return next(promise).catch(error => Promise.resolve('Fine'));
        };

        fetchWithMiddleware(catchError)(
            'http://not-existing-network-error/foo',
            {method: 'GET'}
        )
        .then(r => done())
        .catch(error => done(error))
    });

    it("should pass through the error", done => {
        const reThrowError = next => promise => {
            return next(promise).catch(error => Promise.reject(error));
        };

        fetchWithMiddleware(reThrowError)(
            'http://not-existing-network-error/foo',
            {method: 'GET'}
        )
        .then(_ => done(new Error('Should have pass the error through')))
        .catch(error => done())
    });
});

describe("Post request hooks", () => {
    it("should accept a promise", done => {
        const errorHandlingPostRequest = next => promise => {
            return next(promise).then(_ => {
                throw new Error('foo');
            })
        };

        fetchWithMiddleware(addHostToUrl, errorHandlingPostRequest)(
            '/request',
            {method: 'GET'}
        )
        .then(() => done(new Error('Should have failed in post hook')))
        .catch(error => done());
    });

    it("should fails on post hook", done => {
        const errorHandlingPostRequest = next => promise => {
            return next(promise).then(_ => {
                return new Promise((_, reject) => {
                    setTimeout(() => {
                        reject("Rejected on post request");
                    }, 50);
                });
            })
        };

        fetchWithMiddleware(addHostToUrl, errorHandlingPostRequest)(
            '/request',
            {method: 'GET'}
        )
        .then(() => done(new Error('Should have failed in post hook')))
        .catch(error => done());
    });
});

let onlyOnce = (fn) => {
    let called = false;

    return () => {
        if (called) {
            return Promise.reject(new Error('Called more then once'));
        }

        called = true;

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                fn().then(resolve).catch(reject);
            }, 50);
        });
    };
};
