/**
 * @type {import('lint-staged').Configuration}
 */
const filterTemplates = (files) =>
	files.filter(
		(f) =>
			!f.replace(/\\/g, '/').includes('Project/Templates/') &&
			!f.replace(/\\/g, '/').includes('Project/Script/main/module-init.js')
	);

module.exports = {
	'*.{js,ts,css}': (files) => {
		const filtered = filterTemplates(files);
		return filtered.length > 0 ? `oxfmt -c ./.oxfmtrc.json --write ${filtered.join(' ')}` : '';
	},
	'*.{js,ts}': (files) => {
		const filtered = filterTemplates(files);
		return filtered.length > 0 ? `oxlint -c ./.oxlintrc.json --fix ${filtered.join(' ')}` : '';
	}
};
