/*global fetch */

export default function fetchWithConfig(config) {
    return fetch(config.uri, config.opts);
}
