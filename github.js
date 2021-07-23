// https://stackoverflow.com/questions/13394077/is-there-a-way-to-increase-the-api-rate-limit-or-to-bypass-it-altogether-for-git
// In order to increase the API rate limit you might
// authenticate yourself at Github via your OAuth2 token or
// use a key/secret to increase the unauthenticated rate limit.
// There are multiple ways of doing this:
// Basic Auth + OAuth2Token
// curl -u <token>:x-oauth-basic https://api.github.com/user
// Set and Send OAuth2Token in Header
// curl -H "Authorization: token OAUTH-TOKEN" https://api.github.com
// Set and Send OAuth2Token as URL Parameter
// curl https://api.github.com/?access_token=OAUTH-TOKEN
// Set Key & Secret for Server-2-Server communication
// curl 'https://api.github.com/users/whatever?client_id=xxxx&client_secret=yyyy'
function getLimit(response) {
	let total = response.headers.get("x-ratelimit-limit")
	let remaining = response.headers.get("x-ratelimit-remaining")
	console.log("LIMIT", remaining * 1, '/', total * 1)
	return { total, remaining }
}



export class GitHub {
	constructor(userAgent, clientID, clientSecret) {
		this.userAgent = userAgent // required by GitHub
		this.id = clientID
		this.secret = clientSecret
		// console.log("github", this.id, this.secret)
		// this.token = token
	}


	get headers() {
		return {
			'User-Agent': this.userAgent,
			// 'Authorization': 'token ' + this.token
			'Authorization': 'Basic ' + btoa(this.id + ":" + this.secret),
			'Access-Control-Allow-Origin': '*',
		}
	}


	async API(path, options = {}, log = {}) {
		console.log('gitHubAPI', path, options)
		// options.access_token = this.token
		// options.client_id = this.username
		// options.client_secret = this.password
		let queryString = new URLSearchParams(options).toString()
		// this.logger?.log(name, path + '?' + queryString)
		// fetch(`https://api.max.pub/datver/?message=${btoa('API\t' + url)}`)
		// console.log("API", 'https://api.github.com' + path + '?' + queryString)
		let response = await fetch('https://api.github.com' + path + '?' + queryString, {
			headers: { ... this.headers }
		});
		let limit = getLimit(response)
		// console.log("STATUS", response.status)
		// this.logger?.log(`${remaining.padStart(4, ' ')}/${limit}   ${response.status}   ${name}`, path + '?' + queryString)
		this.logger?.log({
			limit: limit.remaining + '/' + limit.total,
			status: response.status,
			...log,
			path: path + '?' + queryString
		})

		return await response.json()
	}


	async file(user, repo, commit, file) {
		let path = `/${user}/${repo}/${commit}/${file}`
		console.log('gitHubFile', path)
		// this.logger?.log('FILE', path)

		// fetch(`https://api.max.pub/datver/?message=${btoa('RAW\t' + path)}`)
		let response = await fetch(`https://raw.githubusercontent.com${path}`, {
			headers: { ... this.headers }
		})
		// let limit = getLimit(response)

		this.logger?.log({
			// limit: limit.remaining + '/' + limit.total,
			// status: response.status,
			status: '302',
			user,
			repo,
			action: 'FILE',
			path
		})

		return await response.text()
	}


	async fileRedirect() {
		this.logger?.log({
			// limit: limit.remaining + '/' + limit.total,
			// status: response.status,
			status: '302',
			user,
			repo,
			action: 'FILE-LINK',
			path
		})
		return new Response(null, {
			headers: {
				location: `https://raw.githubusercontent.com${path}`,
			},
			status: 302,
		});
	}


	repos(user) {
		return this.API(`/users/${user}/repos`, { per_page: 100 }, { user, action: 'REPOS' })
	}
	changes(user, repo, commit) {
		return this.API(`/repos/${user}/${repo}/commits/${commit}`, { user, repo, action: 'CHANGES' });
	}

	folder(user, repo, commit, folder) {
		return this.API(`/repos/${user}/${repo}/git/trees/${commit}`, {}, { user, repo, action: 'FOLDER' });
	}



	// https://api.github.com/repos/giampaolo/psutil/tags
	async tags(user, repo) {
		let commits = await this.API(`/repos/${user}/${repo}/tags`, { per_page: 100 }, { user, repo, action: 'TAGS' })
		if (!Array.isArray(commits)) return [];
		return commits?.map(x => ({
			id: x.commit.sha,
			tag: x.name,
		})) ?? [];
	}

	// https://api.github.com/repos/max-pub/idbkv/commits?since=&until=
	async commits(user, repo, since, until) {
		// console.log('load commits', user, repo, since, until)
		let options = { per_page: 100 }
		if (since) options.since = since
		if (until) options.until = until
		// since = since ? 'since=' + since : '' //.toISOString().slice(0, 19) : '';
		// until = until ? 'until=' + until : '' //.toISOString().slice(0, 19) : '';
		var commits = await this.API(`/repos/${user}/${repo}/commits`, options, { user, repo, action: 'COMMITS' });
		if (!Array.isArray(commits)) return [];
		//   console.log('comm',commits)
		// commits = JSON.parse(commits);
		return commits?.map(x => ({
			id: x.sha,
			// url: commit[0].url,
			date: x.commit.author.date.slice(0, 10),
			time: x.commit.author.date.slice(11, 19),
			// time: commit[0].commit.author.date,
			message: x.commit.message,
		})) ?? [];
	}

}
