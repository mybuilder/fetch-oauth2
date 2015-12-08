export default function applyMiddleware(...middlewares) {
    return (baseRequest) => {
        let chain = middlewares.concat();

        return compose(...chain)(baseRequest);
    }
}

function compose(...funcs) {
    return arg => funcs.reduceRight((composed, f) => f(composed), arg)
}
