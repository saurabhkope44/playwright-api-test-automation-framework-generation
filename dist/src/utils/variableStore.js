"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableStore = void 0;
const env_config_1 = require("../config/env.config");
class VariableStore {
    static values = new Map();
    static set(key, value) {
        this.values.set(key, value === undefined || value === null ? '' : String(value));
    }
    static get(key) {
        if (this.values.has(key))
            return this.values.get(key) ?? '';
        return env_config_1.EnvConfig.resolveSecretOrValue(key, false);
    }
    static resolve(input) {
        if (typeof input !== 'string')
            return input;
        return input
            .replace(/\{\{([^}]+)}}/g, (_match, key) => this.get(key.trim()))
            .replace(/\$\{([^}]+)}/g, (_match, key) => env_config_1.EnvConfig.get(key.trim()));
    }
    static snapshot() {
        return Object.fromEntries(this.values.entries());
    }
}
exports.VariableStore = VariableStore;
