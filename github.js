

export class GitHub {
	constructor(userAgent, token) {
		this.userAgent = userAgent // required by GitHub
		// this.username = username
		// this.password = password
		this.token = token
	}

	API(path, options = {}, name = 'API') {
		console.log('gitHubAPI', path, options)
		options.access_token = this.token
		let queryString = new URLSearchParams(options).toString()
		this.logger?.log(name, path + '?' + queryString)
		// fetch(`https://api.max.pub/datver/?message=${btoa('API\t' + url)}`)
		// console.log("API", 'https://api.github.com' + path + '?' + queryString)
		return fetch('https://api.github.com' + path + '?' + queryString, {
			headers: {
				'User-Agent': this.userAgent,
				// 'Authorization': 'Basic ' + btoa(this.username + ":" + this.password)
			}
		}).then(x => x.json());
	}
	file(user, repo, commit, file) {
		let path = `/${user}/${repo}/${commit}/${file}`
		this.logger?.log('FILE', path)
		// fetch(`https://api.max.pub/datver/?message=${btoa('RAW\t' + path)}`)
		return fetch(`https://raw.githubusercontent.com${path}`).then(x => x.text())
	}


	repos(user) {
		return this.API(`/users/${user}/repos`, { per_page: 100 })
	}
	changes(user, repo, commit) {
		return this.API(`/repos/${user}/${repo}/commits/${commit}`);
	}

	folder(user, repo, commit, folder) {
		return this.API(`/repos/${user}/${repo}/git/trees/${commit}`, {}, 'FOLDER');
	}



	// https://api.github.com/repos/giampaolo/psutil/tags
	async tags(user, repo) {
		let commits = await this.API(`/repos/${user}/${repo}/tags`, { per_page: 100 }, 'TAGS')
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
		var commits = await this.API(`/repos/${user}/${repo}/commits`, options, 'COMMITS');
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
