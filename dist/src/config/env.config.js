"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class EnvConfig {
    static get(key, required = true) {
        const normalizedKey = key.replace(/^\$\{(.+)}$/, '$1').trim();
        const value = process.env[normalizedKey];
        if (required && (value === undefined || value === '')) {
            throw new Error(`Missing required environment variable: ${normalizedKey}`);
        }
        return value ?? '';
    }
    static resolvePlaceholders(input) {
        if (typeof input !== 'string')
            return input;
        return input.replace(/\$\{([^}]+)}/g, (_match, key) => EnvConfig.get(key));
    }
    static resolveSecretOrValue(value, required = false) {
        if (value === undefined || value === null)
            return '';
        const raw = String(value).trim();
        if (!raw)
            return '';
        if (/^\$\{[^}]+}$/.test(raw)) {
            return EnvConfig.get(raw, required);
        }
        if (/^[A-Z][A-Z0-9_]+$/.test(raw) && process.env[raw] !== undefined) {
            return EnvConfig.get(raw, required);
        }
        return String(EnvConfig.resolvePlaceholders(raw));
    }
}
exports.EnvConfig = EnvConfig;
