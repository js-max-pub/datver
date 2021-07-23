
export class Logger {
	constructor(request) {
		this.request = request
	}

	async log(x = {}) {
		// console.log('log', x)
		let host = this.request.headers.get('host')
		let ip = this.request.headers.get("cf-connecting-ip") ?? '';
		if (!ip) ip = this.request.headers.get("x-forwarded-for") ?? '';
		// console.log("IP", ip)
		//ip.padStart(16, ' '), 
		let body = [host.padEnd(16), (x.limit ?? '').padStart(12), x.status, (x.user ?? '').padEnd(16), (x.repo ?? '').padEnd(16), (x.action ?? '').padEnd(12), '\t\t', x.path, '\t\t', JSON.stringify(Object.fromEntries(Array.from(this.request.headers)))].join('    ')
		// console.log('body', body)
		// var formData = new FormData();
		// formData.append("test", 'jo');
		// formData.append("message", 'body');
		let text = await fetch(`https://api.max.pub/datver?ip=${ip}&message=` + btoa(body), {
			// method: 'POST',
			// headers: {
			// 	'Content-Type': 'multipart/form-data'
			// },
			// body: formData
		}).then(x => x.text())
		console.log("logged", text, 'bytes')
	}
}
