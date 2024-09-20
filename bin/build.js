#!/usr/bin/env bun

import { createEvents } from "ics";
import { minify as htmlMinify } from "html-minifier-terser";
import { promises as fs } from "node:fs";
import { render } from "ejs";
import { resolve } from "node:path";

const outputFile = 'nodejs-releases.ics';

const htmlMinifyOptions = {
	collapseWhitespace: true,
	removeAttributeQuotes: true,
	removeComments: true,
};

await main();

async function main() {
	await fs.mkdir("public", { recursive: true });

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
	const today = new Date().toISOString().split("T").at(0);

	const supportedVersions = Object.fromEntries(
		Object.entries(schedule).filter(([, release]) => {
			return new Date(release.end).getTime() > new Date(today).getTime();
		})
	);

	console.log(Object.keys(supportedVersions))

	const events = Object.entries(supportedVersions).flatMap(([version, release]) => {
		return [
			{
				title: `Node ${version}`,
				start: [...release.start.split("-").map(Number), 0, 0],
				end: [...release.start.split("-").map(Number), 23, 59],
			},
			release.lts ? {
				title: `Node ${version} LTS`,
				start: [...release.lts.split("-").map(Number), 0, 0],
				end: [...release.lts.split("-").map(Number), 23, 59],
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
	console.time("Creating page");

	const templateFile = resolve("./src/template.ejs");
	const iconFile = resolve("./src/favicon.svg");

	const template = (await fs.readFile(templateFile)).toString();
	const icon = (await fs.readFile(iconFile)).toString();

	const html = await htmlMinify(render(template, { version }), htmlMinifyOptions);

	const favicon = await htmlMinify(icon, {
		...htmlMinifyOptions,
		removeAttributeQuotes: false,
	});

	await fs.writeFile("public/favicon.svg", favicon);
	await fs.writeFile("public/index.html", html);

	console.timeEnd("Creating page");
}
