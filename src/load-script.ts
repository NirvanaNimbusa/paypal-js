import { findScript, insertScriptElement, processOptions } from './utils';
import type { PayPalScriptOptions } from '../types/script-options';
import type { PayPalNamespace } from '../types/index';

type PromiseResults = Promise<PayPalNamespace | null>;
let loadingPromise: PromiseResults;
let isLoading = false;

declare global {
    interface Window {
        paypal?: PayPalNamespace;
    }
}

export default function loadScript(options: PayPalScriptOptions, PromisePonyfill?: PromiseConstructor): PromiseResults {
    if (!(options instanceof Object)) {
        throw new Error('Invalid arguments. Expected an object to be passed into loadScript().');
    }

    if (typeof PromisePonyfill === 'undefined') {
        // default to using window.Promise as the Promise implementation
        if (typeof Promise === 'undefined') {
            throw new Error('Failed to load the PayPal JS SDK script because Promise is undefined. To resolve the issue, use a Promise polyfill.');
        }

        PromisePonyfill = Promise;
    }

    // resolve with the existing promise when the script is loading
    if (isLoading) return loadingPromise;

    return loadingPromise = new PromisePonyfill((resolve, reject) => {
        // resolve with null when running in Node
        if (typeof window === 'undefined') return resolve(null);

        const { url, dataAttributes } = processOptions(options);

        // resolve with the existing global paypal object when a script with the same src already exists
        if (findScript(url, dataAttributes) && window.paypal) return resolve(window.paypal);

        isLoading = true;

        insertScriptElement({
            url,
            dataAttributes,
            onSuccess: () => {
                isLoading = false;
                if (window.paypal) return resolve(window.paypal);
                return reject(new Error('The window.paypal global variable is not available.'));
            },
            onError: () => {
                isLoading = false;
                return reject(new Error(`The script "${url}" didn't load correctly.`));
            }
        });
    });
}
