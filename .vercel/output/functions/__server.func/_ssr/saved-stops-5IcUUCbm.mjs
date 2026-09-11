import "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { s as Slot } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:not-disabled:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/90",
			ghost: "bg-transparent text-foreground hover:bg-card-2",
			outline: "border border-border bg-transparent text-foreground hover:bg-card-2",
			key: "bg-card-2 text-foreground hover:bg-border",
			subtle: "bg-card text-foreground hover:bg-card-2"
		},
		size: {
			default: "h-11 rounded-md px-4 text-sm",
			sm: "h-9 rounded-sm px-3 text-sm",
			lg: "h-14 rounded-lg px-5 text-base",
			icon: "size-11 rounded-md",
			key: "h-16 rounded-lg text-2xl font-display font-semibold tabular-nums"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
var cache = null;
var listCache = null;
var pending = null;
function toStop(code, raw) {
	return {
		code,
		lng: raw[0],
		lat: raw[1],
		name: raw[2],
		road: raw[3]
	};
}
async function loadStops() {
	if (cache) return cache;
	if (!pending) pending = fetch("/data/stops.json").then((res) => {
		if (!res.ok) throw new Error("Could not load bus stops");
		return res.json();
	}).then((raw) => {
		const map = /* @__PURE__ */ new Map();
		for (const [code, value] of Object.entries(raw)) map.set(code, toStop(code, value));
		cache = map;
		return map;
	});
	return pending;
}
async function getStop(code) {
	return (await loadStops()).get(code);
}
async function allStops() {
	if (listCache) return listCache;
	const map = await loadStops();
	listCache = Array.from(map.values());
	return listCache;
}
function searchStops(stops, query, limit = 20) {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const digits = /^\d+$/.test(q);
	const scored = [];
	for (const stop of stops) {
		const name = stop.name.toLowerCase();
		const road = stop.road.toLowerCase();
		let score = -1;
		if (digits) {
			if (stop.code === q) score = 0;
			else if (stop.code.startsWith(q)) score = 1;
			else if (stop.code.includes(q)) score = 4;
		} else if (name === q) score = 0;
		else if (name.startsWith(q)) score = 1;
		else if (name.includes(q)) score = 2;
		else if (road.startsWith(q)) score = 3;
		else if (road.includes(q)) score = 4;
		if (score >= 0) scored.push({
			stop,
			score
		});
	}
	scored.sort((a, b) => a.score - b.score || a.stop.name.localeCompare(b.stop.name));
	return scored.slice(0, limit).map((s) => s.stop);
}
function toRad(deg) {
	return deg * Math.PI / 180;
}
function distanceMeters(lat1, lng1, lat2, lng2) {
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 12742e3 * Math.asin(Math.sqrt(a));
}
function nearbyStops(stops, lat, lng, limit = 12) {
	return stops.map((stop) => ({
		stop,
		meters: distanceMeters(lat, lng, stop.lat, stop.lng)
	})).sort((a, b) => a.meters - b.meters).slice(0, limit);
}
function formatDistance(meters) {
	if (meters < 1e3) return `${Math.round(meters)} m`;
	return `${(meters / 1e3).toFixed(1)} km`;
}
var SUGGESTED_STOPS = [
	"92241",
	"01012",
	"75009",
	"08031",
	"46009"
];
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("animate-pulse rounded-md bg-card-2", className),
		...props
	});
}
var MAX_RECENTS = 8;
var useSavedStops = create()(persist((set, get) => ({
	saved: [],
	recents: [],
	isSaved: (code) => get().saved.includes(code),
	toggleSaved: (code) => set((state) => ({ saved: state.saved.includes(code) ? state.saved.filter((c) => c !== code) : [code, ...state.saved] })),
	addRecent: (code) => set((state) => ({ recents: [code, ...state.recents.filter((c) => c !== code)].slice(0, MAX_RECENTS) }))
}), { name: "halt-stops" }));
//#endregion
export { cn as a, loadStops as c, useSavedStops as d, allStops as i, nearbyStops as l, SUGGESTED_STOPS as n, formatDistance as o, Skeleton as r, getStop as s, Button as t, searchStops as u };
