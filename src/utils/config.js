export default class Config {
    uri;
    opts;

    constructor({uri = '', opts = {}} = {}) {
        this.uri = uri;
        this.opts = opts;
    }

    setHeader(name, value) {
        const {headers, ...opts} = this.opts;

        return new Config({uri: this.uri, opts: {...opts, headers: {...headers, [name]: value}}});
    }

    setAccessToken({token_type, access_token}) {
        return this.setHeader('Authorization', token_type + ' ' + access_token);
    }

    updateUri(fn) {
        return new Config({opts: this.opts, uri: fn(this.uri)});
    }
}
