import { HandleRequest } from "./build/index.js"

const port = process.env.NODE_ENV === "dist" ? 3006 : 3005

const server = Bun.serve({
	port,
	async fetch(req) {
		const response = await HandleRequest(req)
		if (response) return response

		return new Response("Not found", { status: 404 })
	},
})

console.log(`Server running on port ${server.port}`)
