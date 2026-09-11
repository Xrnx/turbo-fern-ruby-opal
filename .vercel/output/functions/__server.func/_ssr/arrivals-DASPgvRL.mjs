import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { i as string, r as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/arrivals-DASPgvRL.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function normalizeEta(raw) {
	if (!raw || !raw.time && raw.duration_ms == null) return null;
	return {
		time: raw.time ?? null,
		duration_ms: typeof raw.duration_ms === "number" ? raw.duration_ms : null,
		load: raw.load ?? null,
		feature: raw.feature ?? null,
		type: raw.type ?? null,
		destination_code: raw.destination_code ?? null,
		origin_code: raw.origin_code ?? null,
		monitored: typeof raw.monitored === "number" ? raw.monitored : null
	};
}
var getArrivals_createServerFn_handler = createServerRpc({
	id: "548d4980325f5a1a0b324d3beb3f5a4bb853165c918fa00b8dcf728aa82f6023",
	name: "getArrivals",
	filename: "src/lib/arrivals.ts"
}, (opts) => getArrivals.__executeServer(opts));
var getArrivals = createServerFn({ method: "POST" }).validator(object({ code: string().regex(/^\d{5}$/) })).handler(getArrivals_createServerFn_handler, async ({ data }) => {
	const res = await fetch(`https://arrivelah2.busrouter.sg/?id=${data.code}`, { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error("Could not load arrivals. Try again in a moment.");
	const services = ((await res.json()).services ?? []).map((svc) => ({
		no: String(svc.no ?? ""),
		operator: String(svc.operator ?? ""),
		next: normalizeEta(svc.next),
		next2: normalizeEta(svc.next2),
		next3: normalizeEta(svc.next3)
	})).filter((svc) => svc.no && (svc.next || svc.next2 || svc.next3));
	services.sort((a, b) => {
		const aMs = a.next?.duration_ms ?? Number.POSITIVE_INFINITY;
		const bMs = b.next?.duration_ms ?? Number.POSITIVE_INFINITY;
		if (aMs !== bMs) return aMs - bMs;
		return a.no.localeCompare(b.no, "en", {
			numeric: true,
			sensitivity: "base"
		});
	});
	return {
		code: data.code,
		services
	};
});
//#endregion
export { getArrivals_createServerFn_handler };
