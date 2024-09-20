#!/usr/bin/env bun

import { createEvents } from 'ics';
import { minify as htmlMinify } from 'html-minifier-terser';
import { promises as fs } from 'node:fs';
import { render } from 'ejs';
import { resolve } from 'node:path';

const outputFile = 'nodejs-releases.ics';

const htmlMinifyOptions = {
	calName: 'Node.js Releases',
	collapseWhitespace: true,
	removeAttributeQuotes: true,
	removeComments: true,
};

const icsDefaultOptions = {
	startOutputType: 'utc',
	endOutputType: 'utc',
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

	console.log(Object.keys(supportedVersions))

	const events = Object.entries(supportedVersions).flatMap(([version, release]) => {
		return [
			{
				...icsDefaultOptions,
				title: getReleaseName('Current', version, release),
				start: [...release.start.split('-').map(Number), 0, 0],
				end: [...release.start.split('-').map(Number), 23, 59],
			},

			release.lts ? {
				...icsDefaultOptions,
				title: getReleaseName('LTS', version, release),
				start: [...release.lts.split('-').map(Number), 0, 0],
				end: [...release.lts.split('-').map(Number), 23, 59],
			} : undefined,

			release.maintenance ? {
				...icsDefaultOptions,
				title: getReleaseName('Maintenance', version, release),
				start: [...release.maintenance.split('-').map(Number), 0, 0],
				end: [...release.maintenance.split('-').map(Number), 23, 59],
			} : undefined,

			release.end ? {
				...icsDefaultOptions,
				title: getReleaseName('End-of-life', version, release),
				start: [...release.end.split('-').map(Number), 0, 0],
				end: [...release.end.split('-').map(Number), 23, 59],
			} : undefined
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

function getReleaseName(type, version, release) {
	const fragments = [
		`Node.js`,
		version,
		type,
		release.codename ? `"${release.codename}"` : '',
	];

	return fragments.join(' ');
}
