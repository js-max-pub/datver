
export class Logger {
	constructor(request) {
		this.request = request
	}

	async log(name, message) {
		let ip = this.request.headers.get('host')
		console.log("LOG", ip, name, message)
		let text = await fetch(`https://api.max.pub/datver/?ip=${ip}&name=${name}&message=${btoa(message)}`).then(x => x.text())
		console.log("LOG response", text)
	}
}
