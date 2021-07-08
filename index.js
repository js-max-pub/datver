const paid = {
	idbkv: 'max-pub/idbkv'
}

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];



addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request))
})




async function handleRequest(request) {

	let options = parseRequest(request);
	console.log('options', options);

	if (!options || !options.user)
		return jsonResponse({ error: 'parameters missing', syntax: '/@user/repo/version/file' })

	if (!options.repo) {
		let repos = await gitHubAPI(`/users/${options.user}/repos?per_page=100`)
		if (!Array.isArray(repos))
			return jsonResponse({ error: 'no repos found' })
		// console.log('repos', repos)
		return jsonResponse(repos.map(x => x.name))
	}


	var commits = await loadCommits(options.user, options.repo, options.since, options.until);
	// console.log('commits', commits)
	if (!commits)
		return jsonResponse({ error: 'no commits found' })

	if (!options.file) {
		let output = [... new Set(commits.map(x => encodeDate(x.date)).flat())].sort().reverse()
		// let output = [...new Set(commits.flatMap(x => encodeDate(x.date)))]
		return jsonResponse(output)
	}

	let file = await fetch(`https://raw.githubusercontent.com/${options.user}/${options.repo}/${commits[0].id}/${options.file}`).then(x => x.text())
	return new Response(file, { status: 200, headers: { 'Content-Type': 'application/javascript' } })

}




function jsonResponse(o) {
	return new Response(JSON.stringify(o, null, '\t'), { status: 200, headers: { 'Content-Type': 'application/json' } })
}



function encodeDate(string) {
	string = string.slice(2)
	return [string, string.slice(0,2), string.slice(0,5)];
}

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





const userAgent = 'chrono-version' // required by GitHub




function gitHubAPI(url) {
	console.log('gitHubAPI', url)
	return fetch(`https://api.github.com` + url, { headers: { 'User-Agent': userAgent } }).then(x => x.json());
}





// https://api.github.com/repos/max-pub/idbkv/commits?since=&until=
async function loadCommits(user, repo, since, until) {
	// console.log('load commits', user, repo, since, until)
	since = since ? 'since=' + since.toISOString().slice(0, 19) : '';
	until = until ? 'until=' + until.toISOString().slice(0, 19) : '';
	var commits = await gitHubAPI(`/repos/${user}/${repo}/commits?${since}&${until}`);
	if (!Array.isArray(commits)) return false;
	//   console.log('comm',commits)
	// commits = JSON.parse(commits);
	return commits.map(x => ({
		id: x.sha,
		// url: commit[0].url,
		date: x.commit.author.date.slice(0, 10),
		time: x.commit.author.date.slice(11, 19),
		// time: commit[0].commit.author.date,
		message: x.commit.message,
	}));
}





function parseRequest(request) {
	// let options = {};
	let path = new URL(request.url).pathname;
	console.log('path', path);
	// let [user, repo, version, file] = path.split('/').filter(x => x.trim());
	// console.log('vars', user, repo, version, file);
	let parts = path.split('/').filter(x => x.trim());
	console.log('parts', parts);

	if (parts.length == 0) return false;

	if (parts[0][0] != '@') {
		if (paid[parts[0]]) var [user, repo] = paid[parts[0]].split('/');
		else return false;
		parts = parts.slice(1);
	} else {
		var [user, repo] = parts
		user = user.slice(1)
		parts = parts.slice(2);
	}
	console.log('user/repo', user, repo);

	if (parts[0]) {
		var version = parts[0];
		var date = {
			year: ('20' + version.slice(0, 2)) * 1,
			month: version.replace(/[^a-z]/g, ''),
			day: version.slice(2).replace(/[^0-9]/g, '') * 1,
		}
		if (date.month.length) {
			if (date.month.length == 1)
				date.month = date.month.charCodeAt() - 96
			else if (date.month.length == 3)
				date.month = months.indexOf(date.month) + 1;
			else date.month = null;
		}
		var since = new Date(date.year, date.month - 1 || 0, date.day || 1, 0, 0, 0);
		var until = new Date(date.year, date.day ? (date.month - 1 || 11) : (date.month || 12), date.day || 0, 23, 59, 59);
	}
	console.log('date', date, since, until);
	var file = parts.slice(1).join('/')
	return { user, repo, version, date, since, until, file };
}





