export default function preventRaceCondition(fn) {
    let pending = null;

    return (...args) => {
        if (pending) {
            return pending.then(result => Promise.resolve(result));
        }

        pending = fn(...args)
            .then(result => {
                pending = null;

                return result;
            })
            .catch(error => {
                pending = null;

                throw error;
            });

        return pending;
    };
}
