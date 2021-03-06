import paid from './paid.js'
import { GitHub } from './github.js';
import { Logger } from './logger.js'

// import { minify } from 'https://cdn.skypack.dev/terser';


// addEventListener('fetch', event => {
// 	console.log('\n\n new request')
// 	event.respondWith(requestHandler(event.request))
// })



import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
serve(requestHandler)


async function requestHandler(webRequest) {
	let github = new GitHub("dateVersioning",
		Deno.env.get('datver_client_id'),
		Deno.env.get('datver_client_secret')
	)
	// console.log("IP", webRequest)
	github.logger = new Logger(webRequest)

	let request = requestParser(webRequest);
	console.log('request', request);

	if (!request.user) {
		return jsonResponse({
			error: 'parameters missing', syntax: '/@user/repo/version/file',
			ip: webRequest.headers.get("x-forwarded-for"), host: webRequest.headers.get('host'),
			paid: paid.users[webRequest.headers.get('host')]
		})
	}

	if (!request.repo) {
		let repos = await github.repos(request.user)
		if (!Array.isArray(repos))
			return jsonResponse({ error: 'no repos found' })
		// console.log('repos', repos)
		return jsonResponse(repos.map(x => x.name))
	}


	// console.log('commits', commits)
	// if (!commits)
	// 	return jsonResponse({ error: 'no commits found' })

	if (!request.version) {
		// '2021-03-05' -> ['21', '21-03', '21-03-05']
		// let encodeDate = s => [s.slice(0), s.slice(0, 4), s.slice(0, 7)];

		let tags = await github.tags(request.user, request.repo)
		let commits = await github.commits(request.user, request.repo);
		// console.log("VERSIONS", commits)
		return jsonResponse({
			dates: [... new Set(commits.map(x => x.date))],
			// dates: [... new Set(commits.map(x => encodeDate(x.date)).flat())].sort().reverse(),
			tags: tags.map(x => x.tag)
		})
	}

	var commits = [];
	if (request.date)
		commits = await github.commits(request.user, request.repo, request.date?.since, request.date?.until);
	if (request.tag)
		commits = (await github.tags(request.user, request.repo)).filter(x => x.tag.startsWith(request.version))

	// console.log('lastCommit', commits[0])
	let lastCommit = commits[0]?.id
	if (!request.file || request.file.endsWith('/')) {
		// console.log('commits')
		// console.log(commits)

		let folder = await github.folder(request.user, request.repo, lastCommit, request.file)
		return jsonResponse(folder?.tree?.map(x => x.path + (x.type == 'tree' ? '/' : '')))

	}

	if (request.minify) {
		let { minify } = await import('https://cdn.skypack.dev/terser')
		let file = await github.file(request.user, request.repo, lastCommit, request.file)
		let minFile = (await minify(file)).code
		console.log('file', file.length, 'minified to', minFile.length, '=', (minFile.length / file.length * 100).toFixed(2) + '%')
		// let file = await fetch(`https://raw.githubusercontent.com/${options.user}/${options.repo}/${commits[0].id}/${options.file}`).then(x => x.text())
		return new Response(minFile, { status: 200, headers: defaultHeader })
	}
	let file = await github.file(request.user, request.repo, lastCommit, request.file)
	return new Response(file, { status: 200, headers: defaultHeader })
	return await github.fileRedirect(request.user, request.repo, lastCommit, request.file)
}



function requestParser(webRequest) {
	// let options = {};
	let url = new URL(webRequest.url)
	let path = url.pathname;
	let params = Object.fromEntries(url.searchParams)
	// console.log('path', path);
	// let [user, repo, version, file] = path.split('/').filter(x => x.trim());
	// console.log('vars', user, repo, version, file);
	let parts = path.split('/').filter(x => x.trim());
	// console.log('requestParser', parts);

	if (parts.length == 0) return {}

	if (parts[0][0] != '@') { // search for paid top-level-repos
		let host = webRequest.headers.get('host')
		// host = 'jsv.max.pub'
		// console.log('check payment', parts[0])
		if (paid.repos[parts[0]]) var [user, repo] = paid.repos[parts[0]].split('/');
		else if (paid.users[host]) var [user, repo] = [paid.users[host], parts[0]]
		else return false;
		parts = parts.slice(1);
	} else {
		var [user, repo] = parts
		user = user.slice(1) // remove the "@"
		parts = parts.slice(2); // rest after user/repo/
	}
	// console.log('user/repo', user, repo);


	// if (parts[0]) { // parse version
	// 	var version = parts[0]
	// 	var  = decodeVersion(parts[0])
	// 	// var semver = decodeVers

	// }
	// console.log('date', date, since, until);
	// console.log('since', '\n', since.toDateString(), '\n', since.toISOString(), '\n', since.toLocaleDateString(), '\n', since.toUTCString())
	var file = parts.slice(1).join('/')
	return { user, repo, version: parts[0], ...decodeVersion(parts[0]), file, ...params };
}





let corsHeader = { 'Access-Control-Allow-Origin': '*' }
let jsHeader = { 'Content-Type': 'application/javascript' }
let defaultHeader = { ...jsHeader, ...corsHeader }
function jsonResponse(o) {
	return new Response(JSON.stringify(o, null, '\t'), {
		status: 200,
		headers: defaultHeader
	})
}




const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function decodeVersion(version) {
	if (!version?.trim()) return {}
	if (version.includes('.') || version.length < 4) { // it's a tag
		let parts = version.split('.')
		let number = x => x ? x * 1 : null
		return { tag: { major: number(parts[0]), minor: number(parts[1]), patch: number(parts[2]) } }
	} else { // it's a date
		let isoDate = d => d.getFullYear()
			+ '-' + String(d.getMonth() + 1).padStart(2, '0')
			+ '-' + String(d.getDate()).padStart(2, '0')
		version = version.toLowerCase()
		for (let i in months)
			version = version.replace(months[i], `-${i * 1 + 1}-`)
		console.log('version', version)
		let [y, m, d] = version.split('-')
		let parts = {
			year: y * 1,
			month: m * 1 || null,
			day: d * 1 || null,
			// year: (version.slice(0, 4)) * 1,
			// month: version.slice(5, 7) * 1 || null,
			// day: version.slice(8, 10) * 1 || null,
		}
		var since = new Date(parts.year, parts.month ? parts.month - 1 : 0, parts.day > 1 ? parts.day - 1 : 1, 0, 0, 0)
		// console.log('since', since, isoDate(since))
		var until = new Date(parts.year, parts.day ? (parts.month - 1 || 11) : (parts.month || 12), parts.day || 0, 23, 59, 59);
		return { date: { ...parts, since: isoDate(since), until: isoDate(until) } }
	}
}

















// function encodeDates(dates) {
// 	// '2021-03-05' -> ['21', '21-03', '21-03-05']
// 	let output = [... new Set(dates.map(s => [s.slice(0), s.slice(0, 4), s.slice(0, 7)]).flat())].sort().reverse()
// 	// for (let i = output.length - 1; i >= 0; i--) {
// 	// 	// 	for(let a = output[i]; )
// 	// 	let a = output[i]
// 	// 	for (let j in months) {
// 	// 		// console.log('replace', j, `-${String(j * 1 + 1).padStart(2, '0')}-`)
// 	// 		a = a.replace(`-${String(j * 1 + 1).padStart(2, '0')}-`, months[j])
// 	// 		if (a.length < 8) a = a.replace(`-${String(j * 1 + 1).padStart(2, '0')}`, months[j])
// 	// 	}
// 	// 	console.log(a)
// 	// 	if (a != output[i]) output.splice(i + 1, 0, a)

// 	// 	// 	let b = a.
// 	// 	// 	let encodeDate = s => [s.slice(0), s.slice(0, 4), s.slice(0, 7)];

// 	// }
// 	return output
// }


	// console.log('make', parts.year, parts.month ? parts.month - 1 : 0, parts.day ?? 1)
	// let root = new Date(parts.year, parts.month ? parts.month - 1 : 0, parts.day ?? 1)
	// console.log('decodeDate', root, isoDate(root))

	// console.log('date',date)
	// if (date.month.length) {
	// 	if (date.month.length == 1)
	// 		date.month = date.month.charCodeAt() - 96
	// 	else if (date.month.length == 3)
	// 		date.month = months.indexOf(date.month) + 1;
	// 	else date.month = null;
	// }
	// var since = new Date(root.getFullYear(), date.month - 1 || 0, date.day || 1, 0, 0, 0);
	// var until = new Date(date.year, date.day ? (date.month - 1 || 11) : (date.month || 12), date.day || 0, 23, 59, 59);
	// return { ...date, since, until }


// function encodeDate(string) {
// 	// console.log('encodeDate', string)
// 	let [year, month, day] = string.split('-')
// 	year = year.slice(2)
// 	// console.log('month',month)
// 	// month = String.fromCharCode(96 + month * 1)
// 	month = months[month*1-1]
// 	// console.log('month',month)
// 	// month = months[month - 1]
// 	// return [year, year + month, year + month + day * 1];
// 	return [year, year + month, year + month + day * 1];
// }


























