/*global describe, it */

import expect from 'expect.js';
import Config from '../src/utils/config.js';

describe("Config", () => {
    it("should have default values", () => {
        let config = new Config();

        expect(config.uri).to.be.equal('');
        expect(config.opts).to.be.eql({});
    });

    it("should set access token", () => {
        let config = new Config();

        expect(config.setAccessToken({token_type: 'Bearer', access_token: 'foobar'}).opts).to.be.eql({ headers: { Authorization: 'Bearer foobar' } });
    });

    it("should update uri", () => {
        let config = new Config();
        let config2 = new Config({uri: '/request'});

        expect(config.updateUri(uri => uri + '/foo').uri).to.be.eql('/foo');
        expect(config2.updateUri(uri => uri + '/foo').uri).to.be.eql('/request/foo');
    });

    it("should maintain all other values", () => {
        let config = new Config({uri: '/request', opts: {method: 'POST', headers: {'Content-Type': 'text/html'}}});

        expect(config
            .setAccessToken({token_type: 'Bearer', access_token: 'foobar'})
            .updateUri(uri => uri + '/foo')
        ).to.be.eql({
            uri: '/request/foo',
            opts: {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/html',
                    Authorization: 'Bearer foobar' }}});
    });
});
