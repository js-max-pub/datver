
export class Logger {
	constructor(request) {
		this.request = request
	}

	async log(x = {}) {
		console.log('log', x)
		// let ip = this.request.headers.get('host')
		const ip = this.request.headers.get("x-forwarded-for") ?? '';
		// console.log("IP", ip)
		//ip.padStart(16, ' '), 
		let body = [ip.padEnd(16, ' '), x.limit.padStart(12, ' '), x.status, x.name.padEnd(8, ' '), x.path, JSON.stringify(Object.fromEntries(Array.from(this.request.headers)))].join('    ')
		console.log('body', body)
		// var formData = new FormData();
		// formData.append("test", 'jo');
		// formData.append("message", 'body');
		let text = await fetch(`https://api.max.pub/datver?message=` + btoa(body), {
			// method: 'POST',
			// headers: {
			// 	'Content-Type': 'multipart/form-data'
			// },
			// body: formData
		}).then(x => x.text())
		console.log("LOG response", text)
	}
}
