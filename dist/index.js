import fs from 'node:fs';
import path from 'node:path';
import appRoot from 'app-root-path';
import ruleComposer from 'eslint-rule-composer';
import _ from 'lodash';
const disabledRules = {};
const dirname = appRoot.toString();
const nodeModules = 'node_modules/';
const importedPlugins = [];
const map = ruleComposer.mapReports;
const disableMeta = (rule) => {
    if (rule.meta?.fixable) {
        delete rule.meta.fixable;
    }
    return rule;
};
const disableFix = (rule) => {
    const disableReports = map(rule, (problem) => {
        delete problem.fix;
        return problem;
    });
    return disableMeta(disableReports);
};
const convertPluginId = (pluginId) => {
    return pluginId.includes('@')
        ?
            pluginId.replace(/eslint-plugin(-|)/u, '').replace(/\/$/, '')
        :
            pluginId.replace(/^eslint-plugin-/u, '');
};
const eslintRules = fs
    .readdirSync(path.join(dirname, nodeModules, 'eslint/lib/rules'))
    .filter((rule) => rule.endsWith('.js') && !rule.includes('index'));
for (const rule of eslintRules) {
    const rulePath = path.posix.join(dirname, nodeModules, 'eslint/lib/rules', rule);
    const { default: importedRule } = await import(rulePath);
    const ruleName = rule.replace('.js', '');
    disabledRules[ruleName] = disableFix(_.cloneDeep(importedRule));
}
const eslintPlugins = fs
    .readdirSync(path.join(dirname, nodeModules))
    .filter((plugin) => (plugin.startsWith('eslint-plugin') || plugin.startsWith('@')) &&
    !plugin.startsWith('@types') &&
    plugin !== 'eslint-plugin-disable-autofix' &&
    plugin !== '@eslint');
for (const plugin of eslintPlugins) {
    if (plugin.includes('@')) {
        const pluginDirectories = fs
            .readdirSync(path.join(dirname, nodeModules, plugin))
            .filter((read) => read.startsWith('eslint-plugin'));
        for (const pluginDirectory of pluginDirectories) {
            const scopedPlugin = path.posix.join(plugin, pluginDirectory);
            const { default: importedPlugin } = await import(scopedPlugin);
            importedPlugin.id = scopedPlugin.replace(path.join(dirname, nodeModules), '');
            importedPlugins.push(importedPlugin);
        }
    }
    else {
        const { default: imported } = await import(plugin);
        imported.id = plugin;
        importedPlugins.push(imported);
    }
}
for (const plugin of importedPlugins) {
    const pluginRules = plugin.rules || {};
    const pluginId = plugin.id || '';
    const pluginName = convertPluginId(pluginId);
    for (const ruleId of Object.keys(pluginRules)) {
        disabledRules[`${pluginName}/${ruleId}`] = disableFix(_.cloneDeep(pluginRules[ruleId]));
    }
}
const plugin = {
    meta: {
        name: 'eslint-plugin-disable-autofix',
        version: '4.3.0',
    },
    configs: {},
    rules: disabledRules,
    processors: {},
};
export default plugin;
