export default class Config {
    _config;

    constructor(config) {
        this._config = config;
    }

    setAccessToken({token_type, access_token}) {
        const config = this._config;

        return new Config({...config, opts: {...config.opts, headers: {...config.opts.headers, 'Authorization': token_type + ' ' + access_token}}});
    }

    updateUri(fn) {
        return new Config({...this._config, uri: fn(this._config.uri)});
    }

    get uri() {
        return this._config.uri;
    }

    get opts() {
        return this._config.opts;
    }
}
