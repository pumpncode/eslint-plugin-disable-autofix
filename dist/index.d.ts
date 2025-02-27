import type { Rule } from 'eslint';
type DisabledRules = Record<string, Rule.RuleModule>;
declare const plugin: {
    meta: {
        name: string;
        version: string;
    };
    configs: {};
    rules: DisabledRules;
    processors: {};
};
export = plugin;
