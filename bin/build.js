#!/usr/bin/env bun

import { createEvents } from 'ics';
import { minify as htmlMinify } from 'html-minifier-terser';
import { promises as fs } from 'node:fs';
import { render } from 'ejs';
import { resolve } from 'node:path';

const outputFile = 'nodejs-releases.ics';

const htmlMinifyOptions = {
	collapseWhitespace: true,
	removeAttributeQuotes: true,
	removeComments: true,
};

const icsDefaultOptions = {
	calName: 'Node.js Releases',
	endInputType: 'utc',
	productId: 'idleberg/nodejs-release-calendar',
	startInputType: 'utc',
	url: 'https://nodejs.org',
};

await main();

async function main() {
	await fs.mkdir('public', { recursive: true });

	const schedule = await downloadSchedule();

	await createCalendar(schedule);
	console.log(`\n\u{2728} Successfully created calendar`);

	await createPage();
	console.log(`\n\u{2728} Successfully created web page`);
}

async function downloadSchedule() {
	console.time('Downloading schedule.json');
	const result = await fetch("https://raw.githubusercontent.com/nodejs/Release/refs/heads/main/schedule.json");
	console.timeEnd('Downloading schedule.json');

	if (!result.ok) {
		throw new Error(`Failed to download schedule: ${result.statusText}`);
	}

	return result.json();
}

async function createCalendar(schedule) {
	const today = new Date().toISOString().split('T').at(0);

	const supportedVersions = Object.fromEntries(
		Object.entries(schedule).filter(([, release]) => {
			return new Date(release.end).getTime() > new Date(String(today)).getTime();
		})
	);

	const events = Object.entries(supportedVersions).flatMap(([version, release]) => {
		return [
			getType('Current', version, release, release.start),
			release.lts ? getType('LTS', version, release, release.lts) : undefined,
			getType('Maintenance', version, release, release.maintenance),
			getType('End-of-life', version, release, release.end),
		];
	}).filter(item => item);

	const { error, value } = createEvents(events);

	if (error) {
		throw new Error(error.message);
	}

	console.time(`Writing ${outputFile}`);
	await fs.writeFile(`public/${outputFile}`, value, 'utf-8');
	console.timeEnd(`Writing ${outputFile}`);
}

async function createPage(version) {
	console.time('Creating page');

	const templateFile = resolve('./src/template.ejs');
	const iconFile = resolve('./src/favicon.svg');

	const template = (await fs.readFile(templateFile)).toString();
	const icon = (await fs.readFile(iconFile)).toString();

	const html = await htmlMinify(render(template, { version }), htmlMinifyOptions);

	const favicon = await htmlMinify(icon, {
		...htmlMinifyOptions,
		removeAttributeQuotes: false,
	});

	await fs.writeFile('public/favicon.svg', favicon);
	await fs.writeFile('public/index.html', html);

	console.timeEnd('Creating page');
}

function getTitle(type, version) {
	const fragments = [
		`${type}:`,
		`Node.js`,
		version,
	];

	return fragments.join(' ');
}

function getType(type, version, release, date) {
	const ymd = date.split('-').map(Number);

	return {
			...icsDefaultOptions,
		title: getTitle(type, version),
		description: getDescription(release),
		start: [...ymd, 0, 0],
		duration: {
			days: 1
		},
	};
}

function getDescription(release) {
	const fragments = [
		release.codename ? `Codename: "${release.codename}"` : '',
		`Initial Release: ${release.start}`,
		release.lts ? `Active LTS Start: ${release.lts}` : '',
		`Maintenance Start: ${release.maintenance}`,
		`End-of-life: ${release.end}`,
	];

	return fragments.join('\n');
}
